/**
 * RagIndexingTaskHandler — indexes workspace resources into a RAG vector store.
 *
 * Pipeline: delete old stores → extract text → chunk → persist document index
 * → embed → save vector store.
 *
 * When documents are present, each invocation performs a full re-index:
 * the existing document-index and vector-store folders are deleted before
 * processing begins.
 *
 * All file paths are derived server-side from WorkspaceService to prevent
 * path traversal attacks from the renderer. The renderer only needs to
 * submit the task; windowId (injected by TaskManagerIpc) is sufficient
 * to resolve everything.
 */

import type { TaskHandler, ProgressReporter } from '../task-handler';
import type { WindowContextManager } from '../../core/window-context';
import type { ServiceContainer } from '../../core/service-container';
import type { LoggerService } from '../../services/logger';
import type { WorkspaceService } from '../../workspace/workspace-service';
import { ExtractorRegistry, Embedder, type VectorIndexingProgressEvent } from '../../rag';

/** Progress weight allocation for each RAG indexing phase. */
const PHASE_EXTRACT = 30;
const PHASE_INDEX = 20;
const PHASE_EMBED = 40;
const PHASE_SAVE = 10;

export interface RagIndexingTaskInput {
	/** Injected server-side by task-manager-ipc. */
	windowId: number;
}

export interface RagIndexingTaskOutput {
	/** Number of documents successfully indexed. */
	indexedCount: number;
	/** IDs that failed (if any). */
	failedIds: string[];
	/** Total chunks stored in the vector store. */
	totalChunks: number;
}

export class RagIndexingTaskHandler implements TaskHandler<
	RagIndexingTaskInput,
	RagIndexingTaskOutput
> {
	readonly type = 'index-resources';

	constructor(
		private readonly windowContextManager: WindowContextManager,
		private readonly globalContainer: ServiceContainer,
		private readonly extractorRegistry: ExtractorRegistry
	) {}

	validate(input: RagIndexingTaskInput): void {
		if (!input?.windowId) {
			throw new Error('windowId is required (injected server-side)');
		}
	}

	async execute(
		input: RagIndexingTaskInput,
		signal: AbortSignal,
		reporter: ProgressReporter
	): Promise<RagIndexingTaskOutput> {
		const { windowId } = input;
		const logger = this.globalContainer.has('logger')
			? this.globalContainer.get<LoggerService>('logger')
			: undefined;

		try {
			// Derive all paths from the trusted WorkspaceService
			const windowContext = this.windowContextManager.get(windowId);
			const workspaceService = windowContext.container.get<WorkspaceService>('workspace');
			const workspacePath = workspaceService.getCurrent();

			if (!workspacePath) {
				throw new Error('No workspace is open for this window');
			}

			logger?.info('RagIndexing', `Starting indexing for workspace: ${workspacePath}`);

			throwIfAborted(signal);

			reporter.progress(0, 'Preparing RAG indexing');
			const embedder = new Embedder(
				this.globalContainer,
				this.extractorRegistry,
				workspaceService,
				logger
			);
			reporter.progress(1, 'Extracting text from documents');
			const { indexedCount, failedIds, totalChunks } = await embedder.run({
				signal,
				clearExisting: true,
				onProgress: (event) => {
					reporter.progress(mapRagIndexingProgressToPercent(event), event.message);
				},
			});

			reporter.progress(
				100,
				indexedCount === 0 && failedIds.length === 0 && totalChunks === 0
					? 'No documents to index'
					: 'Indexing complete'
			);

			logger?.info(
				'RagIndexing',
				`Indexing complete: ${indexedCount} indexed, ${failedIds.length} failed, ${totalChunks} total chunks`
			);

			return { indexedCount, failedIds, totalChunks };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger?.error('RagIndexing', `Indexing failed: ${errorMessage}`, error);
			throw error;
		}
	}
}

function mapRagIndexingProgressToPercent(event: VectorIndexingProgressEvent): number {
	switch (event.phase) {
		case 'extract':
			return scaleProgress(event.completed, event.total, 0, PHASE_EXTRACT);

		case 'index':
			return scaleProgress(
				event.completed,
				event.total,
				PHASE_EXTRACT,
				PHASE_EXTRACT + PHASE_INDEX
			);

		case 'embed':
			return scaleProgress(
				event.completed,
				event.total,
				PHASE_EXTRACT + PHASE_INDEX,
				PHASE_EXTRACT + PHASE_INDEX + PHASE_EMBED
			);

		case 'save':
			return scaleProgress(
				event.completed,
				event.total,
				PHASE_EXTRACT + PHASE_INDEX + PHASE_EMBED,
				PHASE_EXTRACT + PHASE_INDEX + PHASE_EMBED + PHASE_SAVE
			);

		default:
			return 0;
	}
}

function scaleProgress(completed: number, total: number, start: number, end: number): number {
	if (total <= 0) {
		return start;
	}

	return start + Math.round((completed / total) * (end - start));
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function throwIfAborted(signal: AbortSignal): void {
	if (signal.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}
}
