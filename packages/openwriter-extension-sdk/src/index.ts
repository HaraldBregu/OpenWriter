import type {
	ExtensionAppInfo,
	ExtensionCommandContribution,
	ExtensionCommandExecutionResult,
	ExtensionDocPanelBlock,
	ExtensionDocPanelBlocksContent,
	ExtensionDocPanelContent,
	ExtensionDocPanelHtmlContent,
	ExtensionDocPanelRenderContext,
	ExtensionDocumentContextSnapshot,
	ExtensionDocumentSnapshot,
	ExtensionDocumentUpdate,
	ExtensionManifest,
	ExtensionTaskEvent,
	ExtensionTaskSubmission,
	ExtensionTaskSubmissionResult,
	ExtensionWorkspaceChangedEvent,
	ExtensionWorkspaceSnapshot,
} from '@openwriter/extension-types';

export interface Disposable {
	dispose(): void;
}

export interface CommandContext {
	payload?: unknown;
}

export interface ExtensionCommandRegistration extends ExtensionCommandContribution {
	run: (payload?: unknown, context?: CommandContext) => Promise<unknown> | unknown;
}

export interface ExtensionHostApi {
	app: {
		getInfo(): Promise<ExtensionAppInfo>;
	};
	workspace: {
		getCurrent(): Promise<ExtensionWorkspaceSnapshot>;
	};
	documents: {
		getActive(): Promise<ExtensionDocumentSnapshot | null>;
		getById(documentId: string): Promise<ExtensionDocumentSnapshot>;
		getContext(documentId?: string): Promise<ExtensionDocumentContextSnapshot | null>;
		update(documentId: string, patch: ExtensionDocumentUpdate): Promise<ExtensionDocumentSnapshot>;
	};
	tasks: {
		submit(submission: ExtensionTaskSubmission): Promise<ExtensionTaskSubmissionResult>;
	};
}

export interface ExtensionStorageApi {
	get<T = unknown>(key: string): Promise<T | null>;
	set<T = unknown>(key: string, value: T): Promise<T>;
	delete(key: string): Promise<void>;
}

export interface ExtensionPreferencesApi {
	get<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<T>;
}

export interface ExtensionEventsApi {
	onWorkspaceChanged(
		listener: (event: ExtensionWorkspaceChangedEvent) => void | Promise<void>
	): () => void;
	onDocumentChanged(
		listener: (event: ExtensionDocumentSnapshot) => void | Promise<void>
	): () => void;
	onTaskEvent(listener: (event: ExtensionTaskEvent) => void | Promise<void>): () => void;
}

export interface ExtensionCommandsApi {
	register(command: ExtensionCommandRegistration): () => void;
	registerCommand(
		commandId: string,
		handler: (payload?: unknown, context?: CommandContext) => Promise<unknown> | unknown
	): Disposable;
	executeCommand<T = unknown>(
		commandId: string,
		payload?: unknown
	): Promise<ExtensionCommandExecutionResult & { data?: T }>;
}

export interface ExtensionDocPanelRegistration {
	id: string;
	render: (
		context: ExtensionDocPanelRenderContext
	) => Promise<ExtensionDocPanelContent> | ExtensionDocPanelContent;
}

export interface ExtensionPanelsApi {
	registerDocPanel(panel: ExtensionDocPanelRegistration): () => void;
}

export interface DocPanelProvider {
	render(
		context: ExtensionDocPanelRenderContext
	): Promise<ExtensionDocPanelContent> | ExtensionDocPanelContent;
}

export interface ExtensionWindowApi {
	registerDocPanelProvider(panelId: string, provider: DocPanelProvider): Disposable;
}

export interface ExtensionWorkspaceApi {
	getCurrent(): Promise<ExtensionWorkspaceSnapshot>;
	getActiveDocument(): Promise<ExtensionDocumentSnapshot | null>;
	getDocument(documentId: string): Promise<ExtensionDocumentSnapshot>;
	getDocumentContext(documentId?: string): Promise<ExtensionDocumentContextSnapshot | null>;
	updateDocument(
		documentId: string,
		patch: ExtensionDocumentUpdate
	): Promise<ExtensionDocumentSnapshot>;
}

export interface ExtensionLoggerApi {
	info(message: string, data?: unknown): void;
	warn(message: string, data?: unknown): void;
	error(message: string, data?: unknown): void;
}

export interface ExtensionContext {
	manifest: ExtensionManifest;
	subscriptions: Disposable[];
	commands: ExtensionCommandsApi;
	window: ExtensionWindowApi;
	workspace: ExtensionWorkspaceApi;
	panels: ExtensionPanelsApi;
	events: ExtensionEventsApi;
	host: ExtensionHostApi;
	storage: ExtensionStorageApi;
	preferences: ExtensionPreferencesApi;
	log: ExtensionLoggerApi;
}

export interface ExtensionModule {
	activate(context: ExtensionContext): Promise<void> | void;
	deactivate?(): Promise<void> | void;
}

export function defineExtension(module: ExtensionModule): ExtensionModule {
	return module;
}

export function createDisposable(dispose: () => void): Disposable {
	return { dispose };
}

export function text(text: string, id?: string): ExtensionDocPanelBlock {
	return { type: 'text', text, ...(id ? { id } : {}) };
}

export function markdown(markdown: string, id?: string): ExtensionDocPanelBlock {
	return { type: 'markdown', markdown, ...(id ? { id } : {}) };
}

export function notice(
	description: string,
	options: {
		id?: string;
		title?: string;
		tone?: 'info' | 'warning' | 'error' | 'success';
	} = {}
): ExtensionDocPanelBlock {
	return {
		type: 'notice',
		description,
		...(options.id ? { id: options.id } : {}),
		...(options.title ? { title: options.title } : {}),
		...(options.tone ? { tone: options.tone } : {}),
	};
}

export function docPanel(blocks: ExtensionDocPanelBlock[]): ExtensionDocPanelBlocksContent {
	return { blocks };
}

export function htmlPage(
	entryPath: string,
	options: {
		title?: string;
		data?: unknown;
	} = {}
): ExtensionDocPanelHtmlContent {
	return {
		kind: 'html',
		entryPath,
		...(options.title ? { title: options.title } : {}),
		...(options.data !== undefined ? { data: options.data } : {}),
	};
}

export const ui = {
	text,
	markdown,
	notice,
	docPanel,
	htmlPage,
};

export type {
	ExtensionActivationEvent,
	ExtensionCapability,
	ExtensionCommandContribution,
	ExtensionCommandExecutionResult,
	ExtensionCommandInfo,
	ExtensionDocPanelBlock,
	ExtensionDocPanelButtonAction,
	ExtensionDocPanelBlocksContent,
	ExtensionDocPanelClientMessage,
	ExtensionDocPanelContent,
	ExtensionDocPanelContribution,
	ExtensionDocPanelHostMessage,
	ExtensionDocPanelHtmlContent,
	ExtensionDocPanelInfo,
	ExtensionDocPanelInitPayload,
	ExtensionDocPanelKeyValueItem,
	ExtensionDocPanelNoticeTone,
	ExtensionDocPanelRenderContext,
	ExtensionDocPanelRenderReason,
	ExtensionDocumentContextSnapshot,
	ExtensionDocPageContribution,
	ExtensionDocumentChangedEvent,
	ExtensionDocumentSnapshot,
	ExtensionDocumentUpdate,
	ExtensionExecutionContext,
	ExtensionInfo,
	ExtensionManifest,
	ExtensionPermission,
	ExtensionPreferenceContribution,
	ExtensionPreferenceOption,
	ExtensionPreferenceType,
	ExtensionRuntimeState,
	ExtensionSource,
	ExtensionTaskEvent,
	ExtensionTaskSubmission,
	ExtensionTaskSubmissionResult,
	ExtensionWorkspaceChangedEvent,
	ExtensionWorkspaceSnapshot,
} from '@openwriter/extension-types';
