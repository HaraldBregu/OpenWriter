/**
 * KnowledgeBaseBuilder — builds a vector knowledge base from markdown files.
 *
 * Reads a list of markdown file paths, extracts their content, splits into
 * overlapping chunks, generates embeddings via the OpenAI SDK, and persists
 * the resulting vector store and document index to the target directory.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { chunkText, type ChunkOptions } from '../rag/text-splitter';
import { VectorStore } from '../rag/vector-store';
import { DocumentIndexStore } from '../rag/document-index-store';
import { createEmbeddingModel, type EmbeddingOptions } from '../shared/embedding-factory';

export type KnowledgeBaseBuildPhase = 'read' | 'chunk' | 'embed' | 'save';

export interface KnowledgeBaseBuildProgress {
	phase: KnowledgeBaseBuildPhase;
	completed: number;
	total: number;
	message: string;
	filePath?: string;
	chunkCount?: number;
}

export interface KnowledgeBaseBuildInput {
	markdownPaths: string[];
	targetPath: string;
	embeddingOptions: EmbeddingOptions;
	chunkOptions?: ChunkOptions;
	signal?: AbortSignal;
	onProgress?: (event: KnowledgeBaseBuildProgress) => void;
}

export interface KnowledgeBaseBuildResult {
	indexedCount: number;
	failedPaths: string[];
	totalChunks: number;
}

interface PendingDocument {
	filePath: string;
	fileName: string;
	content: string;
	chunks: Awaited<ReturnType<typeof chunkText>>;
}

function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}
}

/**
 * Build a knowledge base from a list of markdown files.
 *
 * @param input.markdownPaths  Absolute paths to the markdown files to index
 * @param input.targetPath     Directory where the vector store and document index are saved
 * @param input.embeddingOptions  Provider and API key for the embedding model
 * @param input.chunkOptions   Optional chunk size / overlap overrides
 * @param input.signal         Optional abort signal for cancellation
 * @param input.onProgress     Optional progress callback
 */
export async function buildKnowledgeBase(
	input: KnowledgeBaseBuildInput
): Promise<KnowledgeBaseBuildResult> {
	const { markdownPaths, targetPath, embeddingOptions, chunkOptions, signal, onProgress } = input;

	if (markdownPaths.length === 0) {
		return { indexedCount: 0, failedPaths: [], totalChunks: 0 };
	}

	const vectorStorePath = path.join(targetPath, 'vector_store');
	const documentIndexPath = path.join(targetPath, 'document_index');

	await fs.rm(vectorStorePath, { recursive: true, force: true });
	await fs.rm(documentIndexPath, { recursive: true, force: true });

	const embeddingModel = createEmbeddingModel(embeddingOptions);
	const vectorStore = VectorStore.create(embeddingModel);

	const failedPaths: string[] = [];
	const pendingDocuments: PendingDocument[] = [];

	for (let i = 0; i < markdownPaths.length; i += 1) {
		throwIfAborted(signal);

		const filePath = markdownPaths[i];
		const fileName = path.basename(filePath);

		try {
			const content = await fs.readFile(filePath, 'utf-8');

			if (content.trim().length === 0) {
				failedPaths.push(filePath);
				continue;
			}

			const chunks = await chunkText(
				content,
				{ fileId: filePath, fileName, source: filePath },
				chunkOptions
			);

			pendingDocuments.push({ filePath, fileName, content, chunks });

			onProgress?.({
				phase: 'chunk',
				completed: i + 1,
				total: markdownPaths.length,
				message: `Chunked: ${fileName} (${chunks.length} chunks)`,
				filePath,
				chunkCount: chunks.length,
			});
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw error;
			}
			failedPaths.push(filePath);
		}
	}

	let indexedCount = 0;

	for (let i = 0; i < pendingDocuments.length; i += 1) {
		throwIfAborted(signal);

		const pending = pendingDocuments[i];

		try {
			await vectorStore.addDocuments(pending.chunks);
			indexedCount += 1;

			onProgress?.({
				phase: 'embed',
				completed: i + 1,
				total: pendingDocuments.length,
				message: `Embedded: ${pending.fileName}`,
				filePath: pending.filePath,
				chunkCount: pending.chunks.length,
			});
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw error;
			}
			failedPaths.push(pending.filePath);
		}
	}

	throwIfAborted(signal);

	onProgress?.({
		phase: 'save',
		completed: 0,
		total: 2,
		message: 'Saving document index',
	});

	await DocumentIndexStore.save(
		documentIndexPath,
		pendingDocuments.map((pending) => ({
			fileId: pending.filePath,
			fileName: pending.fileName,
			source: pending.filePath,
			extractedMetadata: { charCount: pending.content.length, format: 'markdown' },
			chunks: pending.chunks,
		}))
	);

	onProgress?.({
		phase: 'save',
		completed: 1,
		total: 2,
		message: 'Saving vector store',
	});

	await vectorStore.save(vectorStorePath);

	onProgress?.({
		phase: 'save',
		completed: 2,
		total: 2,
		message: 'Knowledge base saved',
	});

	return {
		indexedCount,
		failedPaths,
		totalChunks: vectorStore.size,
	};
}
