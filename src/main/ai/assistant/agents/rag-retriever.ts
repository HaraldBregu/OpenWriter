/**
 * RagRetriever — loads the workspace vector store and provides similarity
 * search for the RAG node.
 *
 * The vector store lives at `{workspacePath}/data/vector_store/` and is
 * built by IndexResourcesTaskHandler. When no store file exists yet (first
 * run, or workspace never indexed), retrieve() silently returns an empty
 * array so downstream nodes degrade gracefully.
 */

import type { Document } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { VectorStore, RagPaths } from '../../../rag';

const DEFAULT_TOP_K = 4;
const MIN_SCORE_THRESHOLD = 0.3;

export interface RagRetrieverOptions {
	/** Absolute path to the workspace root. */
	workspacePath: string;
	/** Embedding model used to embed the query at retrieval time. */
	embeddings: EmbeddingsInterface;
	/** Number of documents to retrieve per query. Defaults to 4. */
	topK?: number;
	/** Minimum cosine similarity score to include a document. Defaults to 0.3. */
	minScore?: number;
}

export interface RetrievedDocument {
	pageContent: string;
	metadata: Record<string, unknown>;
	score: number;
}

export class RagRetriever {
	private store: VectorStore | null = null;
	private loaded = false;

	constructor(private readonly options: RagRetrieverOptions) {}

	/**
	 * Perform a similarity search against the workspace vector store.
	 *
	 * Returns an empty array when:
	 *   - The vector store has not been built yet
	 *   - The workspace has no indexed documents
	 *   - An error occurs loading the store
	 */
	async retrieve(query: string): Promise<RetrievedDocument[]> {
		if (!this.loaded) {
			await this.loadStore();
		}

		if (this.store === null || this.store.size === 0) {
			return [];
		}

		const k = this.options.topK ?? DEFAULT_TOP_K;
		const minScore = this.options.minScore ?? MIN_SCORE_THRESHOLD;
		const results = await this.store.similaritySearchWithScore(query, k);
		return results
			.filter(([, score]) => score >= minScore)
			.map(([doc, score]) => toRetrievedDocument(doc, score));
	}

	private async loadStore(): Promise<void> {
		this.loaded = true;
		const storePath = path.join(this.options.workspacePath, VECTOR_STORE_SUBDIR);

		try {
			this.store = await VectorStore.load(storePath, this.options.embeddings);
		} catch {
			// Store directory is missing or unreadable — leave store as null
			this.store = null;
		}
	}
}

function toRetrievedDocument(doc: Document, score: number): RetrievedDocument {
	return {
		pageContent: doc.pageContent,
		metadata: doc.metadata as Record<string, unknown>,
		score,
	};
}
