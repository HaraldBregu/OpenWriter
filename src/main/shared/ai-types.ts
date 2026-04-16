/**
 * Shared AI types used across agents and RAG subsystems.
 *
 * Replaces @langchain/core message types, BaseChatModel,
 * EmbeddingsInterface, and Document with plain TypeScript interfaces
 * backed by the OpenAI SDK.
 */

// ---------------------------------------------------------------------------
// Chat messages
// ---------------------------------------------------------------------------

export interface ChatMessage {
	readonly role: 'system' | 'user' | 'assistant';
	readonly content: string;
}

// ---------------------------------------------------------------------------
// Chat model
// ---------------------------------------------------------------------------

export interface ChatModel {
	invoke(messages: ChatMessage[], signal?: AbortSignal): Promise<string>;
	stream(messages: ChatMessage[], signal?: AbortSignal): AsyncIterable<string>;
	/**
	 * @internal Token listener set by the graph runner for real-time
	 * token interception during streaming. Do not use directly.
	 */
	_tokenListener: ((token: string) => void) | null;
}

// ---------------------------------------------------------------------------
// Embedding model
// ---------------------------------------------------------------------------

export interface EmbeddingModel {
	embedDocuments(texts: string[]): Promise<number[][]>;
	embedQuery(text: string): Promise<number[]>;
}

// ---------------------------------------------------------------------------
// Document chunk (replaces @langchain/core Document)
// ---------------------------------------------------------------------------

export interface DocumentChunk {
	pageContent: string;
	metadata: Record<string, unknown>;
}
