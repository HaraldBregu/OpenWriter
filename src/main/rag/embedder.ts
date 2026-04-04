/**
 * Embedder — orchestrates the full RAG pipeline.
 *
 * Coordinates document extraction, text splitting, embedding generation,
 * and persistent storage of vectors and indexes.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { Document } from '@langchain/core/documents';
import type { LoggerService } from '../services/logger';
import type { WorkspaceService } from '../workspace/workspace-service';
import type { ServiceContainer } from '../core/service-container';
import type { ChunkOptions } from './text-splitter';
import { chunkText } from './text-splitter';
import type { ExtractorRegistry } from './document-loaders';
import { DocumentIndexStore } from './document-index-store';
import { VectorStore } from './vector-store';
import { ProviderResolver } from '../shared/provider-resolver';
import { createEmbeddingModel } from '../shared/embedding-factory';

const LOG_SOURCE = 'Embedder';

export interface VectorIndexingDocument {
	id: string;
	name: string;
	path: string;
}

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
	documents: VectorIndexingDocument[];
	embeddings: EmbeddingsInterface;
	signal: AbortSignal;
	onProgress?: (event: VectorIndexingProgressEvent) => void;
	clearExisting?: boolean;
	chunkOptions?: ChunkOptions;
}

export interface VectorIndexingResult {
	indexedCount: number;
	failedIds: string[];
	totalChunks: number;
}

export interface EmbedderOptions {
	extractorRegistry: ExtractorRegistry;
	workspaceService: WorkspaceService;
	logger?: LoggerService;
	defaultChunkOptions?: ChunkOptions;
}

export class Embedder {
	constructor(private readonly options: EmbedderOptions) {}

	async run(input: RunVectorIndexingInput): Promise<VectorIndexingResult> {
		const vectorStore = VectorStore.create(input.embeddings);
		const failedIds: string[] = [];
		let indexedCount = 0;

		const outputPath = this.options.workspaceService.getVectorStorePath();
		const indexOutputPath = this.options.workspaceService.getDocumentIndexPath();

		if (!outputPath || !indexOutputPath) {
			throw new Error('Failed to resolve RAG paths from workspace');
		}

		if (input.clearExisting !== false) {
			await fs.rm(outputPath, { recursive: true, force: true });
			await fs.rm(indexOutputPath, { recursive: true, force: true });
			this.options.logger?.info(LOG_SOURCE, 'Cleared existing vector store', {
				outputPath,
			});
			this.options.logger?.info(LOG_SOURCE, 'Cleared existing document index', {
				outputPath: indexOutputPath,
			});
		}

		const pendingChunks: Array<{
			document: VectorIndexingDocument;
			extractedMetadata: Record<string, unknown>;
			chunks: Document[];
		}> = [];

		for (let index = 0; index < input.documents.length; index += 1) {
			throwIfAborted(input.signal);

			const document = input.documents[index];
			const extension = path.extname(document.name).toLowerCase();
			const extractor = this.options.extractorRegistry.resolve(extension);

			if (!extractor) {
				this.options.logger?.warn(
					LOG_SOURCE,
					`No extractor for extension: ${extension} (${document.name})`
				);
				failedIds.push(document.id);
				continue;
			}

			try {
				const extracted = await extractor.extract(document.path, input.signal);

				if (extracted.content.trim().length === 0) {
					this.options.logger?.warn(LOG_SOURCE, `Empty content extracted from: ${document.name}`);
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
					input.chunkOptions ?? this.options.defaultChunkOptions
				);

				pendingChunks.push({
					document,
					extractedMetadata: extracted.metadata,
					chunks,
				});
				input.onProgress?.({
					phase: 'extract',
					completed: index + 1,
					total: input.documents.length,
					message: `Extracted: ${document.name} (${chunks.length} chunks)`,
					documentId: document.id,
					documentName: document.name,
					chunkCount: chunks.length,
				});
			} catch (error) {
				if (error instanceof Error && error.name === 'AbortError') {
					throw error;
				}

				this.options.logger?.error(LOG_SOURCE, `Failed to extract ${document.name}`, error);
				failedIds.push(document.id);
			}
		}

		throwIfAborted(input.signal);
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
			throwIfAborted(input.signal);

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

				this.options.logger?.error(LOG_SOURCE, `Failed to embed ${pending.document.name}`, error);
				failedIds.push(pending.document.id);
			}
		}

		throwIfAborted(input.signal);
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
}

function throwIfAborted(signal: AbortSignal): void {
	if (signal.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}
}
