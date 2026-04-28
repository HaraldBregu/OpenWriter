import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { createOpenAIClient } from '../../shared/chat-model-factory';
import { OpenAIContentReviewerLlmCaller } from './llm-call';
import type {
	ContentReviewerAgentInput,
	ContentReviewerAgentOutput,
	ContentReviewerLlmCaller,
} from './types';
import SYSTEM_PROMPT from './SYSTEM.md?raw';

const DEFAULT_PER_CALL_TIMEOUT_MS = 90_000;

export interface ContentReviewerAgentOptions {
	/**
	 * Optional LLM caller. When omitted the agent builds an OpenAI-backed caller
	 * from the input's `providerId`/`apiKey`. Tests inject a fake here.
	 */
	llmCaller?: ContentReviewerLlmCaller;
}

/**
 * ContentReviewerAgent — single streaming LLM call.
 *
 * No routing, no per-task variants. The user prompt goes in, tokens come
 * out via `text` AgentEvents, and the final string is returned.
 */
export class ContentReviewerAgent extends BaseAgent<
	ContentReviewerAgentInput,
	ContentReviewerAgentOutput
> {
	readonly type = 'content-reviewer';

	constructor(private readonly options: ContentReviewerAgentOptions = {}) {
		super();
	}

	validate(input: ContentReviewerAgentInput): void {
		if (!input.prompt?.trim()) throw new AgentValidationError(this.type, 'prompt required');
		if (!input.providerId?.trim())
			throw new AgentValidationError(this.type, 'providerId required');
		if (!input.apiKey?.trim()) throw new AgentValidationError(this.type, 'apiKey required');
		if (!input.modelName?.trim())
			throw new AgentValidationError(this.type, 'modelName required');
	}

	protected async run(
		input: ContentReviewerAgentInput,
		ctx: AgentContext
	): Promise<ContentReviewerAgentOutput> {
		const caller = this.options.llmCaller ?? this.buildDefaultCaller(input);

		const onDelta = (delta: string): void =>
			ctx.onEvent?.({ kind: 'text', at: Date.now(), payload: { text: delta } });

		const content = await caller.stream(
			{
				modelName: input.modelName,
				systemPrompt: SYSTEM_PROMPT,
				userPrompt: input.prompt,
				temperature: input.temperature,
				maxTokens: input.maxTokens,
				onDelta,
			},
			ctx.signal
		);

		return { content };
	}

	private buildDefaultCaller(input: ContentReviewerAgentInput): ContentReviewerLlmCaller {
		const client = createOpenAIClient(input.providerId, input.apiKey);
		const timeoutMs = input.perCallTimeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS;
		return new OpenAIContentReviewerLlmCaller(client, timeoutMs);
	}
}
