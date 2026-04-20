import type { ChatMessage, DocumentChunk } from '../../shared/ai-types';

export interface RagDocumentSource {
	id: string;
	content: string;
	metadata?: Record<string, unknown>;
}

export interface RagIngestInput {
	kind: 'ingest';
	documents: RagDocumentSource[];
	providerId: string;
	apiKey: string;
	embeddingModel?: string;
	chunkSize?: number;
	chunkOverlap?: number;
}

export interface RagQueryInput {
	kind: 'query';
	query: string;
	providerId: string;
	apiKey: string;
	chatModel: string;
	embeddingModel?: string;
	topK?: number;
	systemPrompt?: string;
	history?: ChatMessage[];
}

export type RagAgentInput = RagIngestInput | RagQueryInput;

export interface RagIngestOutput {
	kind: 'ingest';
	chunksIndexed: number;
}

export interface RagQueryOutput {
	kind: 'query';
	answer: string;
	citations: DocumentChunk[];
}

export type RagAgentOutput = RagIngestOutput | RagQueryOutput;
