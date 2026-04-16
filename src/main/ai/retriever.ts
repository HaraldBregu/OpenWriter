import type { EmbeddingModel } from '../shared/ai-types';
import { VectorStore } from '../rag';
import type { ContextRetriever, RetrievedContext } from './types';
import { DEFAULT_RAG_TOP_K, DEFAULT_RAG_MAX_DISTANCE } from './constants';

export interface RAGRetrieverConfig {
  readonly vectorStorePath: string;
  readonly embeddings: EmbeddingModel;
  readonly topK?: number;
  readonly maxDistance?: number;
}

export class RAGContextRetriever implements ContextRetriever {
  private store: VectorStore | null = null;
  private readonly topK: number;
  private readonly maxDistance: number;

  constructor(private readonly config: RAGRetrieverConfig) {
    this.topK = config.topK ?? DEFAULT_RAG_TOP_K;
    this.maxDistance = config.maxDistance ?? DEFAULT_RAG_MAX_DISTANCE;
  }

  async retrieve(query: string, topK?: number): Promise<RetrievedContext[]> {
    const store = await this.getStore();
    if (store.size === 0) return [];

    const k = topK ?? this.topK;
    const results = await store.similaritySearchWithScore(query, k);

    return results
      .filter(([, score]) => score <= this.maxDistance)
      .map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        score,
      }));
  }

  private async getStore(): Promise<VectorStore> {
    if (!this.store) {
      this.store = await VectorStore.load(
        this.config.vectorStorePath,
        this.config.embeddings
      );
    }
    return this.store;
  }
}
