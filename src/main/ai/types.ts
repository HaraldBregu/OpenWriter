import type OpenAI from 'openai';

export interface AgentConfig {
  readonly model?: string;
  readonly systemPrompt?: string;
  readonly temperature?: number;
  readonly maxCompletionTokens?: number;
}

export interface ChatOptions {
  readonly tools?: ReadonlyArray<OpenAI.ChatCompletionTool>;
  readonly toolHandler?: ToolHandler;
  readonly temperature?: number;
  readonly maxCompletionTokens?: number;
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
