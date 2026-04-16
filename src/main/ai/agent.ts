import type OpenAI from 'openai';
import type { AgentConfig, AgentResponse, ChatOptions, StreamChunk } from './types';
import {
  DEFAULT_MODEL,
  DEFAULT_MAX_COMPLETION_TOKENS,
  DEFAULT_TEMPERATURE,
  MAX_TOOL_CALL_ITERATIONS
} from './constants';

export class AIAgent {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly systemPrompt: string | undefined;
  private readonly temperature: number;
  private readonly maxCompletionTokens: number;

  constructor(client: OpenAI, config: AgentConfig = {}) {
    this.client = client;
    this.model = config.model ?? DEFAULT_MODEL;
    this.systemPrompt = config.systemPrompt;
    this.temperature = config.temperature ?? DEFAULT_TEMPERATURE;
    this.maxCompletionTokens = config.maxCompletionTokens ?? DEFAULT_MAX_COMPLETION_TOKENS;
  }

  async chat(
    messages: ReadonlyArray<OpenAI.ChatCompletionMessageParam>,
    options: ChatOptions = {}
  ): Promise<AgentResponse> {
    const fullMessages = this.buildMessages(messages);
    const tools = options.tools as OpenAI.ChatCompletionTool[] | undefined;
    const temperature = options.temperature ?? this.temperature;
    const maxTokens = options.maxCompletionTokens ?? this.maxCompletionTokens;

    let currentMessages: OpenAI.ChatCompletionMessageParam[] = [...fullMessages];
    let iterations = 0;

    while (iterations < MAX_TOOL_CALL_ITERATIONS) {
      iterations++;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: currentMessages,
        temperature,
        max_completion_tokens: maxTokens,
        ...(tools?.length ? { tools } : {})
      });

      const choice = completion.choices[0];
      if (!choice) {
        throw new Error('No completion choice returned from the API');
      }

      const assistantMessage = choice.message;

      if (choice.finish_reason !== 'tool_calls' || !assistantMessage.tool_calls?.length) {
        return {
          message: assistantMessage,
          usage: completion.usage ?? undefined,
          finishReason: choice.finish_reason
        };
      }

      if (!options.toolHandler) {
        return {
          message: assistantMessage,
          usage: completion.usage ?? undefined,
          finishReason: choice.finish_reason
        };
      }

      currentMessages = [
        ...currentMessages,
        { role: 'assistant' as const, tool_calls: assistantMessage.tool_calls },
        ...(await this.executeToolCalls(assistantMessage.tool_calls, options.toolHandler))
      ];
    }

    throw new Error(`Tool call loop exceeded maximum of ${MAX_TOOL_CALL_ITERATIONS} iterations`);
  }

  async *streamChat(
    messages: ReadonlyArray<OpenAI.ChatCompletionMessageParam>,
    options: Omit<ChatOptions, 'toolHandler'> = {}
  ): AsyncIterable<StreamChunk> {
    const fullMessages = this.buildMessages(messages);
    const tools = options.tools as OpenAI.ChatCompletionTool[] | undefined;
    const temperature = options.temperature ?? this.temperature;
    const maxTokens = options.maxCompletionTokens ?? this.maxCompletionTokens;

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [...fullMessages],
      temperature,
      max_completion_tokens: maxTokens,
      stream: true,
      ...(tools?.length ? { tools } : {})
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      const finishReason = chunk.choices[0]?.finish_reason ?? null;

      yield {
        content: delta?.content ?? null,
        finishReason
      };
    }
  }

  private buildMessages(
    messages: ReadonlyArray<OpenAI.ChatCompletionMessageParam>
  ): OpenAI.ChatCompletionMessageParam[] {
    if (!this.systemPrompt) {
      return [...messages];
    }

    return [
      { role: 'system' as const, content: this.systemPrompt },
      ...messages
    ];
  }

  private async executeToolCalls(
    toolCalls: ReadonlyArray<OpenAI.ChatCompletionMessageToolCall>,
    handler: (toolCall: OpenAI.ChatCompletionMessageToolCall) => Promise<string>
  ): Promise<OpenAI.ChatCompletionToolMessageParam[]> {
    const results = await Promise.all(
      toolCalls.map(async (toolCall) => {
        try {
          const result = await handler(toolCall);
          return {
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            content: result
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';
          return {
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: errorMessage })
          };
        }
      })
    );

    return results;
  }
}
