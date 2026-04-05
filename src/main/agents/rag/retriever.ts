import type { Document } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type { WorkspaceService } from '../../workspace/workspace-service';
import { VectorStore } from '../../rag';

const DEFAULT_TOP_K = 4;
const MIN_SCORE_THRESHOLD = 0.3;

export interface RagRetrieverOptions {
	workspaceService: WorkspaceService;
	embeddings: EmbeddingsInterface;
	topK?: number;
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

		try {
			const vectorStorePath = this.options.workspaceService.getVectorStorePath();
			if (!vectorStorePath) {
				this.store = null;
				return;
			}

			this.store = await VectorStore.load(vectorStorePath, this.options.embeddings);
		} catch {
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
