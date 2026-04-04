/**
 * IndexResourcesTaskHandler — indexes workspace resources into a vector store.
 *
 * Pipeline: delete old stores → load documents → extract text → chunk →
 * persist document index → embed → save vector store.
 *
 * Every invocation performs a full re-index: the existing document-index and
 * vector-store folders are deleted before processing begins.
 *
 * All file paths are derived server-side from WorkspaceService to prevent
 * path traversal attacks from the renderer. The renderer only needs to
 * submit the task; windowId (injected by TaskManagerIpc) is sufficient
 * to resolve everything.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { TaskHandler, ProgressReporter } from '../task-handler';
import type { WindowContextManager } from '../../core/window-context';
import type { ServiceContainer } from '../../core/service-container';
import type { FileManager } from '../../shared/file_manager';
import type { DocumentsWatcherService } from '../../workspace/documents-watcher';
import type { LoggerService } from '../../services/logger';
import type { WorkspaceService } from '../../workspace/workspace-service';
import { DocumentsService } from '../../workspace/documents';
import { ProviderResolver } from '../../shared/provider-resolver';
import { createEmbeddingModel } from '../../shared/embedding-factory';
import { ExtractorRegistry, Embedder, type VectorIndexingProgressEvent, RagPaths } from '../../rag';
import type { IndexingInfo } from '../../../shared/types';

const RESOURCES_DIR = 'resources';
const DATA_DIR = 'data';
const INDEXING_INFO_FILE = 'indexing-info.json';

/** Progress weight allocation for each pipeline phase. */
const PHASE_EXTRACT = 30;
const PHASE_INDEX = 20;
const PHASE_EMBED = 40;
const PHASE_SAVE = 10;

export interface IndexResourcesInput {
	/** Injected server-side by task-manager-ipc. */
	windowId: number;
	/** Current workspace path stamped server-side by task-manager-ipc. */
	workspacePath: string;
	/** Path to the workspace resources directory (used for intent only). */
	resourcesPath: string;
}

export interface IndexResourcesOutput {
	/** Number of documents successfully indexed. */
	indexedCount: number;
	/** IDs that failed (if any). */
	failedIds: string[];
	/** Total chunks stored in the vector store. */
	totalChunks: number;
}

export class IndexResourcesTaskHandler implements TaskHandler<
	IndexResourcesInput,
	IndexResourcesOutput
> {
	readonly type = 'index-resources';

	constructor(
		private readonly windowContextManager: WindowContextManager,
		private readonly globalContainer: ServiceContainer,
		private readonly extractorRegistry: ExtractorRegistry
	) {}

	validate(input: IndexResourcesInput): void {
		if (!input?.windowId) {
			throw new Error('windowId is required (injected server-side)');
		}
	}

	async execute(
		input: IndexResourcesInput,
		signal: AbortSignal,
		reporter: ProgressReporter
	): Promise<IndexResourcesOutput> {
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

			const ragPaths = new RagPaths(workspaceService);

			logger?.info('IndexResources', `Starting indexing for workspace: ${workspacePath}`);
			logger?.info('IndexResources', `Document index: ${ragPaths.documentIndex}`);
			logger?.info('IndexResources', `Vector store: ${ragPaths.vectorStore}`);

			// Validate paths are within workspace (prevent directory traversal)
			this.validatePaths(workspacePath, ragPaths.documentIndex, ragPaths.vectorStore);

			// Load documents metadata
			reporter.progress(0, 'Loading documents');
			const fileManagement = this.globalContainer.get<FileManager>('fileManagement');
			const watcher = windowContext.container.has('documentsWatcher')
				? windowContext.container.get<DocumentsWatcherService>('documentsWatcher')
				: null;
			const documentsService = new DocumentsService(fileManagement, watcher, logger);
			const documents = await documentsService.loadAll(workspacePath);

			if (documents.length === 0) {
				reporter.progress(100, 'No documents to index');
				logger?.info('IndexResources', 'No documents found to index');
				return { indexedCount: 0, failedIds: [], totalChunks: 0 };
			}

			throwIfAborted(signal);

			// Create embedding model
			const storeService =
				this.globalContainer.get<import('../../services/store').StoreService>('store');
			const providerResolver = new ProviderResolver(storeService);
			const resolved = providerResolver.resolve({ providerId: 'openai' });
			const embeddingModel = createEmbeddingModel({
				providerId: resolved.providerId,
				apiKey: resolved.apiKey,
			});

			// Run indexing pipeline
			const embedder = new Embedder({
				extractorRegistry: this.extractorRegistry,
				logger,
			});
			reporter.progress(1, 'Extracting text from documents');
			const { indexedCount, failedIds, totalChunks } = await embedder.run({
				documents,
				embeddings: embeddingModel,
				outputPath: ragPaths.vectorStore,
				indexOutputPath: ragPaths.documentIndex,
				signal,
				clearExisting: true,
				onProgress: (event) => {
					reporter.progress(mapIndexingProgressToPercent(event), event.message);
				},
			});

			// Save indexing metadata
			reporter.progress(PHASE_EXTRACT + PHASE_INDEX + PHASE_EMBED, 'Saving indexing metadata');
			const dataDir = path.join(workspacePath, DATA_DIR);
			const indexingInfo: IndexingInfo = {
				lastIndexedAt: Date.now(),
				indexedCount,
				failedCount: failedIds.length,
				totalChunks,
			};
			await fs.mkdir(dataDir, { recursive: true });
			await fs.writeFile(
				path.join(dataDir, INDEXING_INFO_FILE),
				JSON.stringify(indexingInfo, null, 2),
				'utf-8'
			);

			reporter.progress(100, 'Indexing complete');

			logger?.info(
				'IndexResources',
				`Indexing complete: ${indexedCount} indexed, ${failedIds.length} failed, ${totalChunks} total chunks`
			);

			return { indexedCount, failedIds, totalChunks };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger?.error('IndexResources', `Indexing failed: ${errorMessage}`, error);
			throw error;
		}
	}

	private validatePaths(
		workspacePath: string,
		documentIndexPath: string,
		vectorStorePath: string
	): void {
		const resolved = path.resolve(workspacePath);
		const resolvedIndex = path.resolve(documentIndexPath);
		const resolvedStore = path.resolve(vectorStorePath);

		if (!resolvedIndex.startsWith(resolved + path.sep)) {
			throw new Error('Document index path is outside the workspace boundary');
		}
		if (!resolvedStore.startsWith(resolved + path.sep)) {
			throw new Error('Vector store path is outside the workspace boundary');
		}
	}
}

function mapIndexingProgressToPercent(event: VectorIndexingProgressEvent): number {
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
