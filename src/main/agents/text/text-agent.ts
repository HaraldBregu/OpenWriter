import type OpenAI from 'openai';
import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { createChatModel, createOpenAIClient } from '../../shared/chat-model-factory';
import { classifyError, isReasoningModel, toUserMessage } from '../../shared/ai-utils';
import { executeToolCalls, type ParsedToolCall, toOpenAITools } from '../tools';
import type { TextAgentInput, TextAgentOutput, ToolCallRecord } from './types';

const DEFAULT_MAX_ITERATIONS = 10;

/**
 * TextAgent — produce chat/completion output from a configured LLM.
 *
 * Two execution modes:
 *   1. Plain mode (no tools): streams or invokes the ChatModel once.
 *   2. Tool-loop mode (input.tools non-empty): runs a ReAct-style loop
 *      against the OpenAI Chat Completions tools API with a max-iteration
 *      guardrail. Streaming is disabled in this mode.
 */
export class TextAgent extends BaseAgent<TextAgentInput, TextAgentOutput> {
	readonly type = 'text';

	validate(input: TextAgentInput): void {
		if (!input.messages?.length) {
			throw new AgentValidationError(this.type, 'messages required');
		}
		if (!input.apiKey?.trim()) {
			throw new AgentValidationError(this.type, 'apiKey required');
		}
		if (!input.modelName?.trim()) {
			throw new AgentValidationError(this.type, 'modelName required');
		}
		if (input.maxIterations !== undefined && input.maxIterations <= 0) {
			throw new AgentValidationError(this.type, 'maxIterations must be positive');
		}
	}

	protected async run(input: TextAgentInput, ctx: AgentContext): Promise<TextAgentOutput> {
		try {
			if (input.tools?.length) {
				return await this.runToolLoop(input, ctx);
			}
			return await this.runPlain(input, ctx);
		} catch (error) {
			const kind = classifyError(error);
			if (kind === 'abort') throw error;
			const raw = error instanceof Error ? error.message : String(error);
			throw new Error(toUserMessage(kind, raw));
		}
	}

	private async runPlain(input: TextAgentInput, ctx: AgentContext): Promise<TextAgentOutput> {
		const model = createChatModel({
			providerId: input.providerId,
			apiKey: input.apiKey,
			modelName: input.modelName,
			streaming: Boolean(input.streaming),
			temperature: input.temperature,
			maxTokens: input.maxTokens,
		});
		if (input.streaming && ctx.stream) {
			return this.runStreaming(model, input, ctx);
		}
		const content = await model.invoke(input.messages, ctx.signal);
		return { content, tokensStreamed: 0, iterations: 1 };
	}

	private async runStreaming(
		model: ReturnType<typeof createChatModel>,
		input: TextAgentInput,
		ctx: AgentContext
	): Promise<TextAgentOutput> {
		let content = '';
		let tokens = 0;
		for await (const token of model.stream(input.messages, ctx.signal)) {
			this.ensureNotAborted(ctx.signal);
			content += token;
			tokens += 1;
			ctx.stream?.(token);
		}
		return { content, tokensStreamed: tokens, iterations: 1 };
	}

	private async runToolLoop(input: TextAgentInput, ctx: AgentContext): Promise<TextAgentOutput> {
		const client = createOpenAIClient(input.providerId, input.apiKey);
		const tools = input.tools ?? [];
		const openaiTools = toOpenAITools(tools);
		const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;

		const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
		if (input.toolSystemPrompt && input.messages[0]?.role !== 'system') {
			messages.push({ role: 'system', content: input.toolSystemPrompt });
		}
		for (const m of input.messages) {
			messages.push({ role: m.role, content: m.content });
		}

		const collected: ToolCallRecord[] = [];
		const effectiveTemp = isReasoningModel(input.modelName) ? undefined : input.temperature;

		for (let iteration = 1; iteration <= maxIterations; iteration++) {
			this.ensureNotAborted(ctx.signal);
			ctx.progress?.(Math.min(90, (iteration / maxIterations) * 90), `iteration ${iteration}`);

			const response = await client.chat.completions.create(
				{
					model: input.modelName,
					messages,
					tools: openaiTools,
					...(effectiveTemp !== undefined ? { temperature: effectiveTemp } : {}),
					...(input.maxTokens ? { max_tokens: input.maxTokens } : {}),
				},
				ctx.signal ? { signal: ctx.signal } : undefined,
			);

			const choice = response.choices[0];
			const assistant = choice?.message;
			if (!assistant) {
				throw new Error('Empty response from model');
			}

			messages.push({
				role: 'assistant',
				content: assistant.content ?? null,
				...(assistant.tool_calls ? { tool_calls: assistant.tool_calls } : {}),
			} as OpenAI.Chat.Completions.ChatCompletionMessageParam);

			const toolCalls = assistant.tool_calls ?? [];
			if (toolCalls.length === 0) {
				ctx.progress?.(100, 'done');
				return {
					content: assistant.content ?? '',
					tokensStreamed: 0,
					toolCalls: collected,
					iterations: iteration,
				};
			}

			const parsed: ParsedToolCall[] = toolCalls
				.filter((tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall => tc.type === 'function')
				.map((tc) => ({
					id: tc.id,
					name: tc.function.name,
					argumentsRaw: tc.function.arguments ?? '',
				}));

			const results = await executeToolCalls(parsed, tools, ctx.signal);

			for (const result of results) {
				collected.push({
					name: result.name,
					argumentsRaw: result.argumentsRaw,
					output: result.output,
					error: result.error,
				});
				messages.push({
					role: 'tool',
					tool_call_id: result.callId,
					content: result.output,
				});
			}
		}

		throw new Error(`Tool loop exceeded max iterations (${maxIterations})`);
	}
}
