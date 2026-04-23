import * as OpenWriter from '@openwriter/extension-sdk';

const STORAGE_KEY = 'demo-openwriter-extension-state';
const COMMAND_IDS = {
	refreshDashboard: 'demo.openwriter.extension.refresh-dashboard',
	logSnapshot: 'demo.openwriter.extension.log-snapshot',
	appendNote: 'demo.openwriter.extension.append-note',
	clearState: 'demo.openwriter.extension.clear-state',
} as const;

interface DemoState {
	observed: {
		workspaceChanges: number;
		documentChanges: number;
		taskEvents: number;
	};
	refreshCount: number;
	writeCount: number;
	lastSnapshotAt: string | null;
	lastWorkspacePath: string | null;
	lastDocumentId: string | null;
	lastDocumentTitle: string | null;
	lastTaskState: string | null;
}

function createDefaultState(): DemoState {
	return {
		observed: {
			workspaceChanges: 0,
			documentChanges: 0,
			taskEvents: 0,
		},
		refreshCount: 0,
		writeCount: 0,
		lastSnapshotAt: null,
		lastWorkspacePath: null,
		lastDocumentId: null,
		lastDocumentTitle: null,
		lastTaskState: null,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

async function readState(context: OpenWriter.ExtensionContext): Promise<DemoState> {
	const stored = await context.storage.get(STORAGE_KEY);
	if (!isRecord(stored)) {
		return createDefaultState();
	}

	const defaults = createDefaultState();
	return {
		...defaults,
		...stored,
		observed: {
			...defaults.observed,
			...(isRecord(stored.observed) ? stored.observed : {}),
		},
	};
}

async function writeState(
	context: OpenWriter.ExtensionContext,
	patch: Partial<DemoState> & {
		observed?: Partial<DemoState['observed']>;
	}
): Promise<DemoState> {
	const current = await readState(context);
	const next: DemoState = {
		...current,
		...patch,
		observed: {
			...current.observed,
			...(patch.observed ?? {}),
		},
	};
	await context.storage.set(STORAGE_KEY, next);
	return next;
}

function readDocumentId(payload: unknown): string | undefined {
	if (!isRecord(payload)) return undefined;
	return typeof payload.documentId === 'string' ? payload.documentId : undefined;
}

async function buildSnapshot(
	context: OpenWriter.ExtensionContext,
	documentId?: string
): Promise<{
	appInfo: OpenWriter.ExtensionAppInfo;
	workspace: OpenWriter.ExtensionWorkspaceSnapshot;
	activeDocument: OpenWriter.ExtensionDocumentSnapshot | null;
	documentContext: OpenWriter.ExtensionDocumentContextSnapshot | null;
	recordedAt: string;
}> {
	const [appInfo, workspace, activeDocument, documentContext] = await Promise.all([
		context.host.app.getInfo(),
		context.host.workspace.getCurrent(),
		documentId ? context.host.documents.getById(documentId) : context.host.documents.getActive(),
		context.host.documents.getContext(documentId),
	]);

	return {
		appInfo,
		workspace,
		activeDocument,
		documentContext,
		recordedAt: new Date().toISOString(),
	};
}

async function refreshDashboard(context: OpenWriter.ExtensionContext, documentId?: string) {
	const [snapshot, currentState] = await Promise.all([
		buildSnapshot(context, documentId),
		readState(context),
	]);
	const state = await writeState(context, {
		refreshCount: currentState.refreshCount + 1,
		lastSnapshotAt: snapshot.recordedAt,
		lastWorkspacePath: snapshot.workspace.currentPath,
		lastDocumentId: snapshot.activeDocument?.id ?? null,
		lastDocumentTitle: snapshot.activeDocument?.title ?? null,
	});
	return { snapshot, state };
}

async function incrementObserved(
	context: OpenWriter.ExtensionContext,
	key: keyof DemoState['observed'],
	extraPatch: Partial<DemoState> = {}
): Promise<void> {
	const current = await readState(context);
	await writeState(context, {
		...extraPatch,
		observed: {
			...current.observed,
			[key]: current.observed[key] + 1,
		},
	});
}

function buildPanelModel(
	snapshot: Awaited<ReturnType<typeof buildSnapshot>>,
	state: DemoState,
	renderContext: OpenWriter.ExtensionDocPanelRenderContext
) {
	const selection = snapshot.documentContext?.selection;
	const editorState = snapshot.documentContext?.editorState;

	return {
		extensionName: 'DemoOpenWriterExtension',
		renderReason: renderContext.reason,
		recordedAt: snapshot.recordedAt,
		app: {
			nameVersion: `${snapshot.appInfo.appName} ${snapshot.appInfo.version}`,
			platform: snapshot.appInfo.platform,
		},
		workspace: {
			currentPath: snapshot.workspace.currentPath ?? 'No workspace selected',
			projectName: snapshot.workspace.projectName ?? 'Untitled project',
		},
		document: snapshot.activeDocument
			? {
					id: snapshot.activeDocument.id,
					title: snapshot.activeDocument.title || 'Untitled',
					characters: snapshot.activeDocument.content.length,
					markdownCharacters: snapshot.documentContext?.markdown.length ?? 0,
					selectionLabel: selection
						? `${selection.from}-${selection.to}`
						: 'No active selection',
					selectionText: selection?.text || 'No selected text',
					activeNode: editorState?.activeNode || 'Unknown',
					activeMarks:
						editorState?.activeMarks.length ? editorState.activeMarks.join(', ') : 'None',
					isFocused: editorState?.isFocused ? 'Yes' : 'No',
					isEditable: editorState?.isEditable ? 'Yes' : 'No',
					isEmpty: editorState?.isEmpty ? 'Yes' : 'No',
					markdownPreview:
						snapshot.documentContext?.markdown?.trim().slice(0, 320) ||
						'Markdown preview will appear once the document has content.',
				}
			: null,
		state: {
			refreshCount: state.refreshCount,
			writeCount: state.writeCount,
			workspaceChanges: state.observed.workspaceChanges,
			documentChanges: state.observed.documentChanges,
			taskEvents: state.observed.taskEvents,
			lastTaskState: state.lastTaskState ?? 'None observed',
		},
		commands: COMMAND_IDS,
	};
}

export async function activate(context: OpenWriter.ExtensionContext): Promise<void> {
	context.events.onWorkspaceChanged(async (event) => {
		await incrementObserved(context, 'workspaceChanges', {
			lastWorkspacePath: event.currentPath,
		});
		context.log.info('Observed workspace change', event);
	});

	context.events.onDocumentChanged(async (document) => {
		await incrementObserved(context, 'documentChanges', {
			lastDocumentId: document.id,
			lastDocumentTitle: document.title,
		});
		context.log.info('Observed document change', { documentId: document.id });
	});

	context.events.onTaskEvent(async (event) => {
		await incrementObserved(context, 'taskEvents', {
			lastTaskState: `${event.taskType}:${event.state}`,
		});
		context.log.info('Observed task event', {
			taskId: event.taskId,
			taskType: event.taskType,
			state: event.state,
		});
	});

	context.commands.register({
		id: COMMAND_IDS.refreshDashboard,
		title: 'DemoOpenWriterExtension: Refresh dashboard',
		description: 'Refresh the dashboard snapshot and persist the latest host state.',
		async run(payload) {
			const documentId = readDocumentId(payload);
			const result = await refreshDashboard(context, documentId);
			return result.snapshot;
		},
	});

	context.commands.register({
		id: COMMAND_IDS.logSnapshot,
		title: 'DemoOpenWriterExtension: Log snapshot',
		description: 'Write the current host snapshot to the extension log.',
		async run(payload) {
			const documentId = readDocumentId(payload);
			const snapshot = await buildSnapshot(context, documentId);
			context.log.info('DemoOpenWriterExtension snapshot', snapshot);
			return snapshot;
		},
	});

	context.commands.register({
		id: COMMAND_IDS.appendNote,
		title: 'DemoOpenWriterExtension: Append note',
		description: 'Append a branded note to the active document.',
		async run(payload) {
			const documentId = readDocumentId(payload);
			const activeDocument = documentId
				? await context.host.documents.getById(documentId)
				: await context.host.documents.getActive();

			if (!activeDocument) {
				throw new Error('No active document is available.');
			}

			const note = `\n\n[DemoOpenWriterExtension] HTML panel sync confirmed at ${new Date().toISOString()}.`;
			await context.host.documents.update(activeDocument.id, {
				content: `${activeDocument.content}${note}`,
			});

			const current = await readState(context);
			await writeState(context, {
				writeCount: current.writeCount + 1,
				lastDocumentId: activeDocument.id,
				lastDocumentTitle: activeDocument.title,
			});

			context.log.info('Appended demo note', { documentId: activeDocument.id });
			return { documentId: activeDocument.id };
		},
	});

	context.commands.register({
		id: COMMAND_IDS.clearState,
		title: 'DemoOpenWriterExtension: Clear state',
		description: 'Clear the stored demo state so the dashboard resets.',
		async run() {
			await context.storage.delete(STORAGE_KEY);
			context.log.info('Cleared DemoOpenWriterExtension state');
			return { cleared: true };
		},
	});

	context.panels.registerDocPanel({
		id: 'demo-openwriter-extension-home',
		async render(renderContext) {
			const { snapshot, state } = await refreshDashboard(context, renderContext.documentId);
			return OpenWriter.ui.htmlPage('dist/panel/index.html', {
				title: 'DemoOpenWriterExtension',
				data: buildPanelModel(snapshot, state, renderContext),
			});
		},
	});
}

export default OpenWriter.defineExtension({ activate });
