/**
 * KnowledgeBaseBuilder — builds a vector knowledge base from markdown files.
 *
 * Reads a list of markdown file paths, splits their content into overlapping
 * chunks, generates embeddings via the OpenAI SDK, and persists the resulting
 * knowledge base to the target directory as JSON.
 *
 * Fully self-contained — no imports from outside src/main/data/.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_BATCH_SIZE = 100;
const KB_VERSION = 1;

export type KnowledgeBaseBuildPhase = 'chunk' | 'embed' | 'save';

export interface KnowledgeBaseBuildProgress {
	phase: KnowledgeBaseBuildPhase;
	completed: number;
	total: number;
	message: string;
	filePath?: string;
	chunkCount?: number;
}

export interface ChunkOptions {
	chunkSize?: number;
	chunkOverlap?: number;
}

export interface EmbeddingOptions {
	apiKey: string;
	model?: string;
	baseURL?: string;
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

interface ChunkRecord {
	content: string;
	embedding: number[];
	metadata: {
		source: string;
		fileName: string;
		chunkIndex: number;
	};
}

interface DocumentRecord {
	fileName: string;
	source: string;
	charCount: number;
	chunkCount: number;
}

interface KnowledgeBaseSnapshot {
	version: number;
	generatedAt: number;
	model: string;
	totalDocuments: number;
	totalChunks: number;
	dimensions: number;
	documents: DocumentRecord[];
	chunks: ChunkRecord[];
}

function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}
}

function splitIntoChunks(
	content: string,
	chunkSize: number,
	chunkOverlap: number
): string[] {
	const chunks: string[] = [];

	if (content.length <= chunkSize) {
		chunks.push(content);
		return chunks;
	}

	let start = 0;
	while (start < content.length) {
		const end = Math.min(start + chunkSize, content.length);
		const chunk = content.slice(start, end);

		if (chunk.trim().length > 0) {
			chunks.push(chunk);
		}

		if (end === content.length) break;
		start += chunkSize - chunkOverlap;
	}

	return chunks;
}

async function generateEmbeddings(
	client: OpenAI,
	texts: string[],
	model: string,
	signal?: AbortSignal
): Promise<number[][]> {
	const allEmbeddings: number[][] = [];

	for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
		throwIfAborted(signal);

		const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
		const response = await client.embeddings.create(
			{ input: batch, model },
			{ signal }
		);

		const sorted = response.data.sort((a, b) => a.index - b.index);
		for (const item of sorted) {
			allEmbeddings.push(item.embedding);
		}
	}

	return allEmbeddings;
}

/**
 * Build a knowledge base from a list of markdown files.
 *
 * Reads each file, splits into overlapping text chunks, calls the OpenAI
 * embeddings API, and writes a single JSON knowledge base file to disk.
 *
 * @param input.markdownPaths   Absolute paths to the markdown files to index
 * @param input.targetPath      Directory where the knowledge base JSON is saved
 * @param input.embeddingOptions  API key, optional model override, optional baseURL
 * @param input.chunkOptions    Optional chunk size / overlap overrides
 * @param input.signal          Optional abort signal for cancellation
 * @param input.onProgress      Optional progress callback
 */
export async function buildKnowledgeBase(
	input: KnowledgeBaseBuildInput
): Promise<KnowledgeBaseBuildResult> {
	const { markdownPaths, targetPath, embeddingOptions, chunkOptions, signal, onProgress } = input;

	if (markdownPaths.length === 0) {
		return { indexedCount: 0, failedPaths: [], totalChunks: 0 };
	}

	const chunkSize = chunkOptions?.chunkSize ?? DEFAULT_CHUNK_SIZE;
	const chunkOverlap = chunkOptions?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
	const model = embeddingOptions.model ?? DEFAULT_EMBEDDING_MODEL;

	const client = new OpenAI({
		apiKey: embeddingOptions.apiKey,
		...(embeddingOptions.baseURL ? { baseURL: embeddingOptions.baseURL } : {}),
	});

	const failedPaths: string[] = [];
	const documentRecords: DocumentRecord[] = [];
	const allChunkTexts: string[] = [];
	const allChunkMeta: Array<{ source: string; fileName: string; chunkIndex: number }> = [];

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

			const textChunks = splitIntoChunks(content, chunkSize, chunkOverlap);

			for (let ci = 0; ci < textChunks.length; ci += 1) {
				allChunkTexts.push(textChunks[ci]);
				allChunkMeta.push({ source: filePath, fileName, chunkIndex: ci });
			}

			documentRecords.push({
				fileName,
				source: filePath,
				charCount: content.length,
				chunkCount: textChunks.length,
			});

			onProgress?.({
				phase: 'chunk',
				completed: i + 1,
				total: markdownPaths.length,
				message: `Chunked: ${fileName} (${textChunks.length} chunks)`,
				filePath,
				chunkCount: textChunks.length,
			});
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw error;
			}
			failedPaths.push(filePath);
		}
	}

	if (allChunkTexts.length === 0) {
		return { indexedCount: 0, failedPaths, totalChunks: 0 };
	}

	throwIfAborted(signal);

	onProgress?.({
		phase: 'embed',
		completed: 0,
		total: allChunkTexts.length,
		message: `Generating embeddings for ${allChunkTexts.length} chunks`,
	});

	const embeddings = await generateEmbeddings(client, allChunkTexts, model, signal);

	onProgress?.({
		phase: 'embed',
		completed: allChunkTexts.length,
		total: allChunkTexts.length,
		message: `Embedded ${allChunkTexts.length} chunks`,
	});

	const chunks: ChunkRecord[] = allChunkTexts.map((text, i) => ({
		content: text,
		embedding: embeddings[i],
		metadata: allChunkMeta[i],
	}));

	const dimensions = embeddings.length > 0 ? embeddings[0].length : 0;

	const snapshot: KnowledgeBaseSnapshot = {
		version: KB_VERSION,
		generatedAt: Date.now(),
		model,
		totalDocuments: documentRecords.length,
		totalChunks: chunks.length,
		dimensions,
		documents: documentRecords,
		chunks,
	};

	throwIfAborted(signal);

	onProgress?.({
		phase: 'save',
		completed: 0,
		total: 1,
		message: 'Saving knowledge base',
	});

	await fs.mkdir(targetPath, { recursive: true });
	await fs.writeFile(
		path.join(targetPath, 'kb.json'),
		JSON.stringify(snapshot),
		'utf-8'
	);

	onProgress?.({
		phase: 'save',
		completed: 1,
		total: 1,
		message: 'Knowledge base saved',
	});

	return {
		indexedCount: documentRecords.length,
		failedPaths,
		totalChunks: chunks.length,
	};
}
