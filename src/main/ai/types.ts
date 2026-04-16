import type OpenAI from 'openai';

export interface RetrievedContext {
  readonly content: string;
  readonly metadata: Record<string, unknown>;
  readonly score: number;
}

export interface ContextRetriever {
  retrieve(query: string, topK?: number): Promise<RetrievedContext[]>;
}

export interface AgentConfig {
  readonly model?: string;
  readonly systemPrompt?: string;
  readonly temperature?: number;
  readonly maxCompletionTokens?: number;
  readonly retriever?: ContextRetriever;
}

export interface ChatOptions {
  readonly tools?: ReadonlyArray<OpenAI.ChatCompletionTool>;
  readonly toolHandler?: ToolHandler;
  readonly temperature?: number;
  readonly maxCompletionTokens?: number;
  readonly retriever?: ContextRetriever;
  readonly ragTopK?: number;
}

export type ToolHandler = (
  toolCall: OpenAI.ChatCompletionMessageToolCall
) => Promise<string>;

export interface AgentResponse {
  readonly message: OpenAI.ChatCompletionMessage;
  readonly usage: OpenAI.CompletionUsage | undefined;
  readonly finishReason: string;
}

export interface StreamChunk {
  readonly content: string | null;
  readonly finishReason: string | null;
}
