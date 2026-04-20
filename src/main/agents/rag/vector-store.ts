import type { DocumentChunk } from '../../shared/ai-types';

interface StoredVector {
	chunk: DocumentChunk;
	embedding: number[];
}

/**
 * InMemoryVectorStore — cosine-similarity search over a flat array.
 *
 * Suitable for per-workspace indices in the main process. Swap for a
 * persistent/ANN store when index size grows beyond a few thousand chunks.
 */
export class InMemoryVectorStore {
	private readonly vectors: StoredVector[] = [];

	add(chunk: DocumentChunk, embedding: number[]): void {
		this.vectors.push({ chunk, embedding });
	}

	addMany(chunks: DocumentChunk[], embeddings: number[][]): void {
		if (chunks.length !== embeddings.length) {
			throw new Error('chunks/embeddings length mismatch');
		}
		for (let i = 0; i < chunks.length; i += 1) {
			this.vectors.push({ chunk: chunks[i], embedding: embeddings[i] });
		}
	}

	search(queryEmbedding: number[], topK: number): DocumentChunk[] {
		if (this.vectors.length === 0) return [];
		const scored = this.vectors.map((v) => ({
			chunk: v.chunk,
			score: cosineSimilarity(queryEmbedding, v.embedding),
		}));
		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, topK).map((s) => s.chunk);
	}

	size(): number {
		return this.vectors.length;
	}

	clear(): void {
		this.vectors.length = 0;
	}
}

function cosineSimilarity(a: number[], b: number[]): number {
	const len = Math.min(a.length, b.length);
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < len; i += 1) {
		dot += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	const denom = Math.sqrt(normA) * Math.sqrt(normB);
	return denom === 0 ? 0 : dot / denom;
}
