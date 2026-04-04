/**
 * Vector Store — thin wrapper around HNSWLib from @langchain/community.
 *
 * HNSWLib uses Hierarchical Navigable Small World graphs for approximate
 * nearest-neighbor search and persists to a directory of binary + JSON files.
 * It is faster than brute-force cosine search and is Electron-compatible via
 * the hnswlib-node native binding.
 *
 * Persists to the directory passed to save() / load():
 *   hnswlib.index  — binary HNSW graph
 *   docstore.json  — document content and metadata
 *   args.json      — space and dimension config
 */

import fs from 'node:fs/promises';
import type { Document } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';

export class VectorStore {
	private store: HNSWLib;

	private constructor(store: HNSWLib) {
		this.store = store;
	}

	static create(embeddings: EmbeddingsInterface): VectorStore {
		const store = new HNSWLib(embeddings, { space: 'cosine' });
		return new VectorStore(store);
	}

	static async load(directory: string, embeddings: EmbeddingsInterface): Promise<VectorStore> {
		const store = await HNSWLib.load(directory, embeddings);
		return new VectorStore(store);
	}

	async save(directory: string): Promise<void> {
		if (this.size === 0) return;
		await fs.mkdir(directory, { recursive: true });
		await this.store.save(directory);
	}

	async addDocuments(documents: Document[]): Promise<void> {
		if (documents.length === 0) return;
		await this.store.addDocuments(documents);
	}

	async similaritySearchWithScore(query: string, k: number): Promise<Array<[Document, number]>> {
		return this.store.similaritySearchWithScore(query, k);
	}

	get size(): number {
		return this.store._index?.getCurrentCount() ?? 0;
	}
}
