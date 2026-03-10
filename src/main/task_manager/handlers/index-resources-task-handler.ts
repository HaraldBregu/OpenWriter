/**
 * IndexResourcesTaskHandler — indexes workspace resources for search/retrieval.
 *
 * Resolves the current workspace path and document list from main-process
 * services (via WindowContextManager), reports per-document progress, and
 * respects AbortSignal for cancellation.
 *
 * The execute() body currently performs a simulated indexing pass; replace
 * it with real embedding / vector-store logic once that infrastructure
 * is available.
 */

import type { TaskHandler, ProgressReporter } from '../task-handler';
import type { WindowContextManager } from '../../core/window-context';
import type { ServiceContainer } from '../../core/service-container';
import type { WorkspaceService } from '../../services/workspace';
import type { FileManagementService } from '../../services/file-management-service';
import type { DocumentsWatcherService } from '../../services/documents-watcher';
import { DocumentsService } from '../../services/documents';

export interface IndexResourcesInput {
	/** Injected server-side by task-manager-ipc. */
	windowId: number;
	/** Workspace root path supplied by the renderer. */
	workspacePath: string;
	/** Path to the workspace resources (documents) directory. */
	resourcesPath: string;
}

export interface IndexResourcesOutput {
	/** Number of documents successfully indexed. */
	indexedCount: number;
	/** IDs that failed (if any). */
	failedIds: string[];
}

export class IndexResourcesTaskHandler implements TaskHandler<
	IndexResourcesInput,
	IndexResourcesOutput
> {
	readonly type = 'index-resources';

	constructor(
		private readonly windowContextManager: WindowContextManager,
		private readonly globalContainer: ServiceContainer
	) {}

	validate(input: IndexResourcesInput): void {
		if (!input?.windowId) {
			throw new Error('windowId is required (injected server-side)');
		}
		if (!input.workspacePath) {
			throw new Error('workspacePath is required');
		}
		if (!input.resourcesPath) {
			throw new Error('resourcesPath is required');
		}
	}

	async execute(
		input: IndexResourcesInput,
		signal: AbortSignal,
		reporter: ProgressReporter
	): Promise<IndexResourcesOutput> {
		const { windowId } = input;

		// Resolve workspace path from the window's scoped WorkspaceService
		const windowContext = this.windowContextManager.get(windowId);
		const workspace = windowContext.getService<WorkspaceService>('workspace', this.globalContainer);
		const currentWorkspace = workspace.getCurrent();

		if (!currentWorkspace) {
			throw new Error('No workspace selected');
		}

		// Load documents from workspace
		const fileManagement = this.globalContainer.get<FileManagementService>('fileManagement');
		const watcher = windowContext.container.has('documentsWatcher')
			? windowContext.container.get<DocumentsWatcherService>('documentsWatcher')
			: null;
		const documentsService = new DocumentsService(fileManagement, watcher);
		const documents = await documentsService.loadAll(currentWorkspace);

		const total = documents.length;

		if (total === 0) {
			reporter.progress(100, 'No documents to index');
			return { indexedCount: 0, failedIds: [] };
		}

		const failedIds: string[] = [];
		let indexedCount = 0;

		for (let i = 0; i < total; i++) {
			if (signal.aborted) {
				throw new DOMException('Aborted', 'AbortError');
			}

			const doc = documents[i];
			const percent = Math.round(((i + 1) / total) * 100);

			try {
				// Simulate per-document indexing work.
				// Replace this with real embedding / chunking logic.
				await sleep(200, signal);

				indexedCount++;
				reporter.progress(percent, `Indexed ${i + 1} of ${total}`, { docId: doc.id });
			} catch (err) {
				if (err instanceof Error && err.name === 'AbortError') {
					throw err;
				}
				failedIds.push(doc.id);
				reporter.progress(percent, `Failed to index ${doc.name}`, {
					docId: doc.id,
					error: true,
				});
			}
		}

		reporter.progress(100, 'Indexing complete');
		return { indexedCount, failedIds };
	}
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function sleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		const t = setTimeout(resolve, ms);
		signal.addEventListener(
			'abort',
			() => {
				clearTimeout(t);
				reject(new DOMException('Aborted', 'AbortError'));
			},
			{ once: true }
		);
	});
}
