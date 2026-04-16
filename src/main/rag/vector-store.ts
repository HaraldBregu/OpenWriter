/**
 * Vector Store — wraps hnswlib-node for approximate nearest-neighbor search.
 *
 * Uses Hierarchical Navigable Small World (HNSW) graphs via the
 * hnswlib-node native binding. Persists to a directory of files:
 *   hnswlib.index  — binary HNSW graph
 *   docstore.json  — document content and metadata
 *   args.json      — space and dimension config
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import pkg from 'hnswlib-node';
const { HierarchicalNSW } = pkg;
import type { DocumentChunk, EmbeddingModel } from '../shared/ai-types';

const INDEX_FILE = 'hnswlib.index';
const DOCSTORE_FILE = 'docstore.json';
const ARGS_FILE = 'args.json';
const MAX_ELEMENTS = 100_000;

export class VectorStore {
	private index: HierarchicalNSW | null = null;
	private docstore = new Map<number, DocumentChunk>();
	private dimensions = 0;
	private nextLabel = 0;

	private constructor(private readonly embeddings: EmbeddingModel) {}

	static create(embeddings: EmbeddingModel): VectorStore {
		return new VectorStore(embeddings);
	}

	static async load(directory: string, embeddings: EmbeddingModel): Promise<VectorStore> {
		const store = new VectorStore(embeddings);

		const argsRaw = await fs.readFile(path.join(directory, ARGS_FILE), 'utf-8');
		const args = JSON.parse(argsRaw) as { numDimensions: number };
		store.dimensions = args.numDimensions;

		store.index = new HierarchicalNSW('cosine', store.dimensions);
		await store.index.readIndex(path.join(directory, INDEX_FILE));

		const docstoreRaw = await fs.readFile(path.join(directory, DOCSTORE_FILE), 'utf-8');
		const entries = JSON.parse(docstoreRaw) as Array<[number, DocumentChunk]>;
		store.docstore = new Map(entries);
		store.nextLabel =
			entries.length > 0 ? Math.max(...entries.map(([label]) => label)) + 1 : 0;

		return store;
	}

	async save(directory: string): Promise<void> {
		if (this.size === 0 || !this.index) return;

		await fs.mkdir(directory, { recursive: true });

		await this.index.writeIndex(path.join(directory, INDEX_FILE));

		const entries = Array.from(this.docstore.entries());
		await fs.writeFile(path.join(directory, DOCSTORE_FILE), JSON.stringify(entries), 'utf-8');

		await fs.writeFile(
			path.join(directory, ARGS_FILE),
			JSON.stringify({ space: 'cosine', numDimensions: this.dimensions }),
			'utf-8'
		);
	}

	async addDocuments(documents: DocumentChunk[]): Promise<void> {
		if (documents.length === 0) return;

		const texts = documents.map((d) => d.pageContent);
		const vectors = await this.embeddings.embedDocuments(texts);

		if (!this.index) {
			this.dimensions = vectors[0].length;
			this.index = new HierarchicalNSW('cosine', this.dimensions);
			this.index.initIndex(MAX_ELEMENTS);
		}

		for (let i = 0; i < documents.length; i++) {
			const label = this.nextLabel++;
			this.index.addPoint(vectors[i], label);
			this.docstore.set(label, documents[i]);
		}
	}

	async similaritySearchWithScore(
		query: string,
		k: number
	): Promise<Array<[DocumentChunk, number]>> {
		if (!this.index || this.size === 0) return [];

		const queryVector = await this.embeddings.embedQuery(query);
		const actualK = Math.min(k, this.size);
		const result = this.index.searchKnn(queryVector, actualK);

		const results: Array<[DocumentChunk, number]> = [];
		for (let i = 0; i < result.neighbors.length; i++) {
			const label = result.neighbors[i];
			const distance = result.distances[i];
			const doc = this.docstore.get(label);
			if (doc) {
				results.push([doc, distance]);
			}
		}

		return results.sort((a, b) => a[1] - b[1]);
	}

	get size(): number {
		return this.index?.getCurrentCount() ?? 0;
	}
}
