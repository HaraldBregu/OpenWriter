/**
 * DocumentIndexStore — saves indexed documents to disk.
 *
 * Stores extracted content and metadata for later retrieval,
 * alongside the vector store for complete document tracking.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { Document } from '@langchain/core/documents';

const STORE_FILE = 'documents.json';
const STORE_VERSION = 1;

export interface IndexedDocumentChunkRecord {
	pageContent: string;
	metadata: Record<string, unknown>;
}

export interface IndexedDocumentRecord {
	fileId: string;
	fileName: string;
	source: string;
	extractedMetadata: Record<string, unknown>;
	indexedAt: number;
	chunkCount: number;
	chunks: IndexedDocumentChunkRecord[];
}

export interface DocumentIndexSnapshot {
	version: number;
	generatedAt: number;
	totalDocuments: number;
	totalChunks: number;
	documents: IndexedDocumentRecord[];
}

export class DocumentIndexStore {
	static async save(
		storePath: string,
		documents: Array<{
			fileId: string;
			fileName: string;
			source: string;
			extractedMetadata: Record<string, unknown>;
			chunks: Document[];
		}>
	): Promise<void> {
		await fs.mkdir(storePath, { recursive: true });
		const indexedAt = Date.now();

		const records: IndexedDocumentRecord[] = documents.map((document) => ({
			fileId: document.fileId,
			fileName: document.fileName,
			source: document.source,
			extractedMetadata: document.extractedMetadata,
			indexedAt,
			chunkCount: document.chunks.length,
			chunks: document.chunks.map((chunk) => ({
				pageContent: chunk.pageContent,
				metadata: chunk.metadata as Record<string, unknown>,
			})),
		}));

		const data: DocumentIndexSnapshot = {
			version: STORE_VERSION,
			generatedAt: indexedAt,
			totalDocuments: records.length,
			totalChunks: records.reduce((sum, record) => sum + record.chunkCount, 0),
			documents: records,
		};

		await fs.writeFile(path.join(storePath, STORE_FILE), JSON.stringify(data, null, 2), 'utf-8');
	}

	static async load(storePath: string): Promise<DocumentIndexSnapshot | null> {
		try {
			const raw = await fs.readFile(path.join(storePath, STORE_FILE), 'utf-8');
			const data = JSON.parse(raw) as DocumentIndexSnapshot;

			if (data.version !== STORE_VERSION || !Array.isArray(data.documents)) {
				return null;
			}

			return data;
		} catch {
			return null;
		}
	}
}
