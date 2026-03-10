/**
 * JsonVectorStore — a lightweight, JSON-serializable vector store.
 *
 * Designed for the document volumes typical in a writing app (hundreds,
 * not millions). Uses brute-force cosine similarity search, which is
 * adequate for this scale and avoids native module dependencies (FAISS,
 * HNSWlib) that would complicate Electron packaging.
 *
 * Persists to a single JSON file on disk at the specified store path.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type { Document } from '@langchain/core/documents';

const STORE_FILE = 'vector-store.json';
const STORE_VERSION = 1;

export interface VectorEntry {
	id: string;
	embedding: number[];
	content: string;
	metadata: Record<string, unknown>;
}

interface StoreData {
	version: number;
	entries: VectorEntry[];
}

export class JsonVectorStore {
	private entries: VectorEntry[] = [];

	constructor(private readonly embeddings: EmbeddingsInterface) {}

	/**
	 * Load an existing vector store from disk, or return a new empty store.
	 */
	static async load(storePath: string, embeddings: EmbeddingsInterface): Promise<JsonVectorStore> {
		const store = new JsonVectorStore(embeddings);
		const filePath = path.join(storePath, STORE_FILE);

		try {
			const raw = await fs.readFile(filePath, 'utf-8');
			const data = JSON.parse(raw) as StoreData;
			if (data.version === STORE_VERSION) {
				store.entries = data.entries;
			}
		} catch {
			// File doesn't exist or is invalid — start fresh
		}

		return store;
	}

	/**
	 * Save the vector store to disk.
	 */
	async save(storePath: string): Promise<void> {
		await fs.mkdir(storePath, { recursive: true });
		const filePath = path.join(storePath, STORE_FILE);
		const data: StoreData = {
			version: STORE_VERSION,
			entries: this.entries,
		};
		await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');
	}

	/**
	 * Add documents to the store by generating their embeddings.
	 *
	 * @param documents - LangChain documents to embed and store
	 * @returns IDs of the newly added entries
	 */
	async addDocuments(documents: Document[]): Promise<string[]> {
		if (documents.length === 0) return [];

		const texts = documents.map((doc) => doc.pageContent);
		const vectors = await this.embeddings.embedDocuments(texts);

		const ids: string[] = [];
		for (let i = 0; i < documents.length; i++) {
			const id = randomUUID();
			this.entries.push({
				id,
				embedding: vectors[i],
				content: documents[i].pageContent,
				metadata: documents[i].metadata as Record<string, unknown>,
			});
			ids.push(id);
		}

		return ids;
	}

	/**
	 * Remove all entries matching a metadata key-value pair.
	 * Used to remove old chunks when re-indexing a file.
	 *
	 * @param key - Metadata key to match
	 * @param value - Value to match against
	 * @returns Number of entries removed
	 */
	removeByMetadata(key: string, value: string): number {
		const before = this.entries.length;
		this.entries = this.entries.filter((entry) => entry.metadata[key] !== value);
		return before - this.entries.length;
	}

	/**
	 * Similarity search using cosine similarity.
	 *
	 * @param query - Text query to search for
	 * @param k - Number of results to return
	 * @returns Array of [Document, score] pairs, sorted by descending similarity
	 */
	async similaritySearchWithScore(
		query: string,
		k: number
	): Promise<Array<[Document, number]>> {
		if (this.entries.length === 0) return [];

		const queryVector = await this.embeddings.embedQuery(query);
		const scored = this.entries.map((entry) => ({
			entry,
			score: cosineSimilarity(queryVector, entry.embedding),
		}));

		scored.sort((a, b) => b.score - a.score);

		const { Document: DocClass } = await import('@langchain/core/documents');

		return scored.slice(0, k).map(({ entry, score }) => [
			new DocClass({
				pageContent: entry.content,
				metadata: entry.metadata,
			}),
			score,
		]);
	}

	/**
	 * Get the total number of entries in the store.
	 */
	get size(): number {
		return this.entries.length;
	}
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	const denominator = Math.sqrt(normA) * Math.sqrt(normB);
	if (denominator === 0) return 0;
	return dot / denominator;
}
