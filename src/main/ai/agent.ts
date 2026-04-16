import type OpenAI from 'openai';
import type {
  AgentConfig,
  AgentResponse,
  ChatOptions,
  ContextRetriever,
  RetrievedContext,
  StreamChunk
} from './types';
import {
  DEFAULT_MODEL,
  DEFAULT_MAX_COMPLETION_TOKENS,
  DEFAULT_TEMPERATURE,
  DEFAULT_RAG_TOP_K,
  MAX_TOOL_CALL_ITERATIONS
} from './constants';

export class AIAgent {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly systemPrompt: string | undefined;
  private readonly temperature: number;
  private readonly maxCompletionTokens: number;
  private readonly retriever: ContextRetriever | undefined;

  constructor(client: OpenAI, config: AgentConfig = {}) {
    this.client = client;
    this.model = config.model ?? DEFAULT_MODEL;
    this.systemPrompt = config.systemPrompt;
    this.temperature = config.temperature ?? DEFAULT_TEMPERATURE;
    this.maxCompletionTokens = config.maxCompletionTokens ?? DEFAULT_MAX_COMPLETION_TOKENS;
    this.retriever = config.retriever;
  }

  async chat(
    messages: ReadonlyArray<OpenAI.ChatCompletionMessageParam>,
    options: ChatOptions = {}
  ): Promise<AgentResponse> {
    const augmented = await this.augmentWithContext(messages, options);
    const fullMessages = this.buildMessages(augmented);
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
    const augmented = await this.augmentWithContext(messages, options);
    const fullMessages = this.buildMessages(augmented);
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

  private async augmentWithContext(
    messages: ReadonlyArray<OpenAI.ChatCompletionMessageParam>,
    options: Pick<ChatOptions, 'retriever' | 'ragTopK'>
  ): Promise<OpenAI.ChatCompletionMessageParam[]> {
    const retriever = options.retriever ?? this.retriever;
    if (!retriever) {
      return [...messages];
    }

    const query = extractUserQuery(messages);
    if (!query) {
      return [...messages];
    }

    const topK = options.ragTopK ?? DEFAULT_RAG_TOP_K;
    const contexts = await retriever.retrieve(query, topK);
    if (contexts.length === 0) {
      return [...messages];
    }

    const contextMessage = formatContextMessage(contexts);
    return [
      { role: 'system' as const, content: contextMessage },
      ...messages
    ];
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

function extractUserQuery(
  messages: ReadonlyArray<OpenAI.ChatCompletionMessageParam>
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user' && typeof msg.content === 'string' && msg.content.trim().length > 0) {
      return msg.content.trim();
    }
  }
  return null;
}

function formatContextMessage(contexts: RetrievedContext[]): string {
  const sections = contexts.map((ctx) => {
    const source = ctx.metadata['fileName'] ?? ctx.metadata['source'] ?? 'unknown';
    return `[Source: ${source}]\n${ctx.content}`;
  });

  return [
    'Use the following context from relevant documents to inform your response.',
    'If the context is not relevant to the question, you may ignore it.',
    '',
    ...sections.map((s) => `---\n${s}`),
    '---'
  ].join('\n');
}
