/**
 * Embedder — orchestrates the full RAG pipeline.
 *
 * Coordinates document extraction, text splitting, embedding generation,
 * and persistent storage of vectors and indexes.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { Document } from '@langchain/core/documents';
import type { WindowContextManager } from '../core/window-context';
import type { LoggerService } from '../services/logger';
import type { WorkspaceService } from '../workspace/workspace-service';
import type { ServiceContainer } from '../core/service-container';
import type { FileManager, FileMetadata } from '../shared/file_manager';
import { DocumentsService } from '../workspace/documents';
import type { ChunkOptions } from './text-splitter';
import { chunkText } from './text-splitter';
import type { ExtractorRegistry } from './document-loaders';
import { DocumentIndexStore } from './document-index-store';
import { VectorStore } from './vector-store';
import { ProviderResolver } from '../shared/provider-resolver';
import { createEmbeddingModel } from '../shared/embedding-factory';
import { getTaskExecutionContext } from '../task/task-execution-context';

const LOG_SOURCE = 'Embedder';

export type VectorIndexingPhase = 'extract' | 'index' | 'embed' | 'save';

export interface VectorIndexingProgressEvent {
	phase: VectorIndexingPhase;
	completed: number;
	total: number;
	message: string;
	documentId?: string;
	documentName?: string;
	chunkCount?: number;
}

export interface RunVectorIndexingInput {
	onProgress?: (event: VectorIndexingProgressEvent) => void;
}

export interface VectorIndexingResult {
	indexedCount: number;
	failedIds: string[];
	totalChunks: number;
}

export class Embedder {
	private static globalContainer?: ServiceContainer;

	private readonly extractorRegistry: ExtractorRegistry;
	private readonly globalContainer: ServiceContainer;
	private readonly logger?: LoggerService;

	static configure(globalContainer: ServiceContainer): void {
		Embedder.globalContainer = globalContainer;
	}

	constructor(private readonly defaultChunkOptions?: ChunkOptions) {
		this.globalContainer = Embedder.resolveGlobalContainer();
		this.extractorRegistry = this.globalContainer.get<ExtractorRegistry>('extractorRegistry');
		this.logger = this.globalContainer.has('logger')
			? this.globalContainer.get<LoggerService>('logger')
			: undefined;
	}

	async run(input: RunVectorIndexingInput): Promise<VectorIndexingResult> {
		const taskContext = this.resolveTaskExecutionContext();
		const workspaceService = this.resolveWorkspaceService();
		const workspacePath = workspaceService.getCurrent();
		if (!workspacePath) {
			throw new Error('No workspace is open for RAG indexing');
		}

		const fileManagement = this.globalContainer.get<FileManager>('fileManagement');
		const documentsService = new DocumentsService(fileManagement, null, this.logger);
		const documents = await documentsService.loadAll(workspacePath);

		if (documents.length === 0) {
			this.logger?.info(LOG_SOURCE, 'No documents found to index');
			return { indexedCount: 0, failedIds: [], totalChunks: 0 };
		}

		// Create embeddings model
		const storeService =
			this.globalContainer.get<import('../services/store').StoreService>('store');
		const providerResolver = new ProviderResolver(storeService);
		const resolved = providerResolver.resolve({ providerId: 'openai' });
		const embeddingModel = createEmbeddingModel({
			providerId: resolved.providerId,
			apiKey: resolved.apiKey,
		});

		const vectorStore = VectorStore.create(embeddingModel);
		const failedIds: string[] = [];
		let indexedCount = 0;

		const outputPath = workspaceService.getVectorStorePath();
		const indexOutputPath = workspaceService.getDocumentIndexPath();

		if (!outputPath || !indexOutputPath) {
			throw new Error('Failed to resolve RAG paths from workspace');
		}

		await fs.rm(outputPath, { recursive: true, force: true });
		await fs.rm(indexOutputPath, { recursive: true, force: true });
		this.logger?.info(LOG_SOURCE, 'Cleared existing vector store', {
			outputPath,
		});
		this.logger?.info(LOG_SOURCE, 'Cleared existing document index', {
			outputPath: indexOutputPath,
		});

		const pendingChunks: Array<{
			document: FileMetadata;
			extractedMetadata: Record<string, unknown>;
			chunks: Document[];
		}> = [];

		for (let index = 0; index < documents.length; index += 1) {
			throwIfAborted(taskContext.signal);

			const document = documents[index];
			const extension = path.extname(document.name).toLowerCase();
			const extractor = this.extractorRegistry.resolve(extension);

			if (!extractor) {
				this.logger?.warn(
					LOG_SOURCE,
					`No extractor for extension: ${extension} (${document.name})`
				);
				failedIds.push(document.id);
				continue;
			}

			try {
				const extracted = await extractor.extract(document.path, taskContext.signal);

				if (extracted.content.trim().length === 0) {
					this.logger?.warn(LOG_SOURCE, `Empty content extracted from: ${document.name}`);
					failedIds.push(document.id);
					continue;
				}

				const chunks = await chunkText(
					extracted.content,
					{
						fileId: document.id,
						fileName: document.name,
						source: document.path,
					},
					this.defaultChunkOptions
				);

				pendingChunks.push({
					document,
					extractedMetadata: extracted.metadata,
					chunks,
				});
				input.onProgress?.({
					phase: 'extract',
					completed: index + 1,
					total: documents.length,
					message: `Extracted: ${document.name} (${chunks.length} chunks)`,
					documentId: document.id,
					documentName: document.name,
					chunkCount: chunks.length,
				});
			} catch (error) {
				if (error instanceof Error && error.name === 'AbortError') {
					throw error;
				}

				this.logger?.error(LOG_SOURCE, `Failed to extract ${document.name}`, error);
				failedIds.push(document.id);
			}
		}

		throwIfAborted(taskContext.signal);
		input.onProgress?.({
			phase: 'index',
			completed: 0,
			total: 1,
			message: 'Saving document index',
		});
		await DocumentIndexStore.save(
			indexOutputPath,
			pendingChunks.map((pending) => ({
				fileId: pending.document.id,
				fileName: pending.document.name,
				source: pending.document.path,
				extractedMetadata: pending.extractedMetadata,
				chunks: pending.chunks,
			}))
		);
		input.onProgress?.({
			phase: 'index',
			completed: 1,
			total: 1,
			message: 'Saved document index',
		});

		for (let index = 0; index < pendingChunks.length; index += 1) {
			throwIfAborted(taskContext.signal);

			const pending = pendingChunks[index];

			try {
				await vectorStore.addDocuments(pending.chunks);
				indexedCount += 1;
				input.onProgress?.({
					phase: 'embed',
					completed: index + 1,
					total: pendingChunks.length,
					message: `Embedded: ${pending.document.name}`,
					documentId: pending.document.id,
					documentName: pending.document.name,
					chunkCount: pending.chunks.length,
				});
			} catch (error) {
				if (error instanceof Error && error.name === 'AbortError') {
					throw error;
				}

				this.logger?.error(LOG_SOURCE, `Failed to embed ${pending.document.name}`, error);
				failedIds.push(pending.document.id);
			}
		}

		throwIfAborted(taskContext.signal);
		input.onProgress?.({
			phase: 'save',
			completed: 0,
			total: 1,
			message: 'Saving vector store',
		});
		await vectorStore.save(outputPath);
		input.onProgress?.({
			phase: 'save',
			completed: 1,
			total: 1,
			message: 'Saved vector store',
		});

		return {
			indexedCount,
			failedIds,
			totalChunks: vectorStore.size,
		};
	}

	private resolveWorkspaceService(): WorkspaceService {
		const taskContext = this.resolveTaskExecutionContext();
		if (taskContext.windowId === undefined) {
			throw new Error('Embedder requires a window-scoped task context');
		}

		const windowContextManager =
			this.globalContainer.get<WindowContextManager>('windowContextManager');
		return windowContextManager
			.get(taskContext.windowId)
			.container.get<WorkspaceService>('workspace');
	}

	private static resolveGlobalContainer(): ServiceContainer {
		if (!Embedder.globalContainer) {
			throw new Error('Embedder has not been configured');
		}

		return Embedder.globalContainer;
	}

	private resolveTaskExecutionContext() {
		const context = getTaskExecutionContext();
		if (!context) {
			throw new Error('Embedder must run inside a task execution context');
		}

		return context;
	}
}

function throwIfAborted(signal: AbortSignal): void {
	if (signal.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}
}
