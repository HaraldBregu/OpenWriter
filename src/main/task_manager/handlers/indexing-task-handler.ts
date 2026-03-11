/**
 * IndexResourcesTaskHandler — indexes workspace resources into a vector store.
 *
 * Pipeline: delete old store → load documents → extract text → chunk → embed → store.
 *
 * Every invocation performs a full re-index: the existing vector store folder
 * is deleted before processing begins.
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
import type { FileManagementService } from '../../services/file-management-service';
import type { DocumentsWatcherService } from '../../services/documents-watcher';
import type { LoggerService } from '../../services/logger';
import type { WorkspaceService } from '../../services/workspace';
import { DocumentsService } from '../../services/documents';
import { ProviderResolver } from '../../shared/provider-resolver';
import { createEmbeddingModel } from '../../shared/embedding-factory';
import { ExtractorRegistry, JsonVectorStore, chunkText } from '../../indexing';

const RESOURCES_DIR = 'resources';
const VECTOR_STORE_SUBDIR = 'vector_store';

/** Progress weight allocation for each pipeline phase. */
const PHASE_EXTRACT = 40;
const PHASE_EMBED = 50;

export interface IndexResourcesInput {
	/** Injected server-side by task-manager-ipc. */
	windowId: number;
	/** Workspace root path supplied by the renderer (used for intent only). */
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

export class IndexResourcesTaskHandler
	implements TaskHandler<IndexResourcesInput, IndexResourcesOutput>
{
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

		// Derive all paths from the trusted WorkspaceService
		const windowContext = this.windowContextManager.get(windowId);
		const workspaceService = windowContext.container.get<WorkspaceService>('workspace');
		const workspacePath = workspaceService.getCurrent();

		if (!workspacePath) {
			throw new Error('No workspace is open for this window');
		}

		const resourcesPath = path.join(workspacePath, RESOURCES_DIR);
		const vectorStorePath = path.join(workspacePath, VECTOR_STORE_SUBDIR);

		logger?.info('IndexResources', `Starting indexing for workspace: ${workspacePath}`);
		logger?.info('IndexResources', `Resources: ${resourcesPath}`);
		logger?.info('IndexResources', `Vector store: ${vectorStorePath}`);

		// Load documents metadata
		reporter.progress(0, 'Loading documents');
		const fileManagement = this.globalContainer.get<FileManagementService>('fileManagement');
		const watcher = windowContext.container.has('documentsWatcher')
			? windowContext.container.get<DocumentsWatcherService>('documentsWatcher')
			: null;
		const documentsService = new DocumentsService(fileManagement, watcher, logger);
		const documents = await documentsService.loadAll(workspacePath);

		if (documents.length === 0) {
			reporter.progress(100, 'No documents to index');
			return { indexedCount: 0, failedIds: [], totalChunks: 0 };
		}

		throwIfAborted(signal);

		// Delete existing vector store folder for a clean re-index
		const resolvedStorePath = path.resolve(vectorStorePath);
		const resolvedWorkspace = path.resolve(workspacePath);
		if (!resolvedStorePath.startsWith(resolvedWorkspace + path.sep)) {
			throw new Error('Vector store path is outside the workspace');
		}
		await fs.rm(vectorStorePath, { recursive: true, force: true });
		logger?.info('IndexResources', 'Cleared existing vector store');

		// Resolve embedding model via ProviderResolver
		const storeService =
			this.globalContainer.get<import('../../services/store').StoreService>('store');
		const providerResolver = new ProviderResolver(storeService);
		const resolved = providerResolver.resolve({ providerId: 'openai' });
		const embeddingModel = createEmbeddingModel({
			providerId: resolved.providerId,
			apiKey: resolved.apiKey,
		});

		// Fresh in-memory vector store (no loading from disk)
		const vectorStore = new JsonVectorStore(embeddingModel);

		const failedIds: string[] = [];
		let indexedCount = 0;
		const total = documents.length;

		// Phase 1: Extract text and chunk documents
		reporter.progress(1, 'Extracting text from documents');
		const pendingChunks: Array<{
			fileId: string;
			filePath: string;
			chunks: import('@langchain/core/documents').Document[];
		}> = [];

		for (let i = 0; i < total; i++) {
			throwIfAborted(signal);

			const doc = documents[i];
			const ext = path.extname(doc.name).toLowerCase();

			const extractor = this.extractorRegistry.resolve(ext);
			if (!extractor) {
				logger?.warn('IndexResources', `No extractor for extension: ${ext} (${doc.name})`);
				failedIds.push(doc.id);
				continue;
			}

			try {
				const extracted = await extractor.extract(doc.path, signal);

				if (extracted.content.trim().length === 0) {
					logger?.warn('IndexResources', `Empty content extracted from: ${doc.name}`);
					failedIds.push(doc.id);
					continue;
				}

				const chunks = await chunkText(extracted.content, {
					fileId: doc.id,
					fileName: doc.name,
					source: doc.path,
				});

				pendingChunks.push({
					fileId: doc.id,
					filePath: doc.path,
					chunks,
				});

				const percent = Math.round(((i + 1) / total) * PHASE_EXTRACT);
				reporter.progress(percent, `Extracted: ${doc.name} (${chunks.length} chunks)`);
			} catch (err) {
				if (err instanceof Error && err.name === 'AbortError') {
					throw err;
				}
				logger?.error('IndexResources', `Failed to extract ${doc.name}`, err);
				failedIds.push(doc.id);
			}
		}

		throwIfAborted(signal);

		// Phase 2: Generate embeddings and add to vector store
		if (pendingChunks.length > 0) {
			reporter.progress(PHASE_EXTRACT, 'Generating embeddings');

			for (let i = 0; i < pendingChunks.length; i++) {
				throwIfAborted(signal);

				const pending = pendingChunks[i];

				try {
					await vectorStore.addDocuments(pending.chunks);

					indexedCount++;
					const percent =
						PHASE_EXTRACT + Math.round(((i + 1) / pendingChunks.length) * PHASE_EMBED);
					reporter.progress(percent, `Embedded: ${path.basename(pending.filePath)}`);
				} catch (err) {
					if (err instanceof Error && err.name === 'AbortError') {
						throw err;
					}
					logger?.error(
						'IndexResources',
						`Failed to embed ${path.basename(pending.filePath)}`,
						err
					);
					failedIds.push(pending.fileId);
				}
			}
		}

		throwIfAborted(signal);

		// Phase 3: Save vector store to disk
		reporter.progress(PHASE_EXTRACT + PHASE_EMBED, 'Saving vector store');
		await vectorStore.save(vectorStorePath);

		const totalChunks = vectorStore.size;
		reporter.progress(100, 'Indexing complete');

		logger?.info(
			'IndexResources',
			`Indexing complete: ${indexedCount} indexed, ${failedIds.length} failed, ${totalChunks} total chunks`
		);

		return { indexedCount, failedIds, totalChunks };
	}
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function throwIfAborted(signal: AbortSignal): void {
	if (signal.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}
}
