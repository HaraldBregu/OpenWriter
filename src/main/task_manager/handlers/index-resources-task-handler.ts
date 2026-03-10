/**
 * IndexResourcesTaskHandler — indexes workspace resources into a vector store.
 *
 * Pipeline: load documents → extract text → chunk → embed → store.
 *
 * All file paths are derived server-side from WorkspaceService to prevent
 * path traversal attacks from the renderer. The renderer only needs to
 * submit the task; windowId (injected by TaskManagerIpc) is sufficient
 * to resolve everything.
 */

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
import { ExtractorRegistry, IndexingManifest, JsonVectorStore, chunkText } from '../../indexing';

const DOCUMENTS_DIR = 'documents';
const VECTOR_STORE_DIR = '.openwriter';
const VECTOR_STORE_SUBDIR = 'vector_store';

/** Progress weight allocation for each pipeline phase (must sum to 100). */
const PHASE_EXTRACT = 40;
const PHASE_EMBED = 50;
const PHASE_SAVE = 10;

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
	/** Number of documents skipped (unchanged since last index). */
	skippedCount: number;
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

		// Derive all paths from the trusted WorkspaceService
		const windowContext = this.windowContextManager.get(windowId);
		const workspaceService = windowContext.container.get<WorkspaceService>('workspace');
		const workspacePath = workspaceService.getCurrent();

		if (!workspacePath) {
			throw new Error('No workspace is open for this window');
		}

		const resourcesPath = path.join(workspacePath, DOCUMENTS_DIR);
		const vectorStorePath = path.join(workspacePath, VECTOR_STORE_DIR, VECTOR_STORE_SUBDIR);

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
			return { indexedCount: 0, failedIds: [], skippedCount: 0, totalChunks: 0 };
		}

		throwIfAborted(signal);

		// Load manifest and vector store
		const manifest = await IndexingManifest.load(vectorStorePath);

		// Resolve embedding model via ProviderResolver
		const storeService =
			this.globalContainer.get<import('../../services/store').StoreService>('store');
		const providerResolver = new ProviderResolver(storeService);
		const resolved = providerResolver.resolve({ providerId: 'openai' });
		const embeddingModel = createEmbeddingModel({
			providerId: resolved.providerId,
			apiKey: resolved.apiKey,
		});

		const vectorStore = await JsonVectorStore.load(vectorStorePath, embeddingModel);

		// Clean up stale entries (files that no longer exist)
		const currentFileIds = new Set(documents.map((d) => d.id));
		const staleIds = manifest.getStaleEntries(currentFileIds);
		for (const staleId of staleIds) {
			vectorStore.removeByMetadata('fileId', staleId);
			manifest.removeEntry(staleId);
		}

		const failedIds: string[] = [];
		let indexedCount = 0;
		let skippedCount = 0;
		const total = documents.length;

		// Phase 1: Extract text and chunk documents
		reporter.progress(1, 'Extracting text from documents');
		const pendingChunks: Array<{
			fileId: string;
			filePath: string;
			lastModified: number;
			chunks: import('@langchain/core/documents').Document[];
			contentHash: string;
		}> = [];

		for (let i = 0; i < total; i++) {
			throwIfAborted(signal);

			const doc = documents[i];
			const ext = path.extname(doc.name).toLowerCase();

			// Check if document needs re-indexing
			if (!manifest.needsReindex(doc.id, doc.lastModified)) {
				skippedCount++;
				const percent = Math.round(((i + 1) / total) * PHASE_EXTRACT);
				reporter.progress(percent, `Skipped unchanged: ${doc.name}`);
				continue;
			}

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

				const contentHash = await IndexingManifest.hashFile(doc.path);

				pendingChunks.push({
					fileId: doc.id,
					filePath: doc.path,
					lastModified: doc.lastModified,
					chunks,
					contentHash,
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
					// Remove old chunks for this file before adding new ones
					vectorStore.removeByMetadata('fileId', pending.fileId);

					// Add new chunks with embeddings
					await vectorStore.addDocuments(pending.chunks);

					// Update manifest
					manifest.setIndexed(
						pending.fileId,
						pending.lastModified,
						pending.contentHash,
						pending.chunks.length
					);

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

		// Phase 3: Save vector store and manifest to disk
		reporter.progress(PHASE_EXTRACT + PHASE_EMBED, 'Saving vector store');
		await vectorStore.save(vectorStorePath);
		await manifest.save(vectorStorePath);

		const totalChunks = vectorStore.size;
		reporter.progress(100, 'Indexing complete');

		logger?.info(
			'IndexResources',
			`Indexing complete: ${indexedCount} indexed, ${skippedCount} skipped, ${failedIds.length} failed, ${totalChunks} total chunks`
		);

		return { indexedCount, failedIds, skippedCount, totalChunks };
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
