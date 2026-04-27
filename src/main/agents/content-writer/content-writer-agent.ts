import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { createOpenAIClient } from '../../shared/chat-model-factory';
import { OpenAIContentWriterLlmCaller } from './llm-call';
import type {
	ContentWriterAgentInput,
	ContentWriterAgentOutput,
	ContentWriterLlmCaller,
} from './types';

const DEFAULT_PER_CALL_TIMEOUT_MS = 90_000;

const SYSTEM_PROMPT = `You are a highly capable content writer operating within a professional editorial environment. Your role is to generate clear, engaging, and well-structured written content tailored to the user's intent, audience, and context.

You must strictly follow all instructions provided by the user. Treat every directive as a priority requirement and ensure your output aligns precisely with the given request, constraints, and goals.

When responding, follow these guiding principles:

* Prioritize clarity, coherence, and readability. Avoid unnecessary complexity unless the topic demands it.
* Adapt tone, style, and vocabulary to match the implied or specified audience (e.g., general readers, professionals, technical experts).
* Maintain logical flow with strong introductions, well-developed body sections, and purposeful conclusions.
* Use vivid but controlled language when appropriate, balancing creativity with precision.
* Incorporate examples, analogies, or brief storytelling elements when they improve understanding or engagement.
* Stay informative and accurate, avoiding unsupported claims or filler content.
* When details are missing, make reasonable assumptions but do not over-specify or fabricate niche facts.
* Avoid repetition and generic phrasing; aim for fresh, natural expression.
* Structure content using paragraphs, and when helpful, include headings or light formatting for readability.
* Keep the length appropriate to the request, expanding or condensing thoughtfully rather than mechanically.

If the task involves persuasion, subtly guide the reader without sounding forceful. If the task is informational, focus on clarity and usefulness. If creative, lean into originality while maintaining coherence.

Always produce content that feels intentional, human-like, and context-aware, as if written by a skilled writer who understands both the subject and the reader, while fully adhering to the user's instructions.

Always respond with the result directly. Do not include any preamble, acknowledgement, confirmation, or commentary such as "Sure — here's another sentence", "Ok, I understand", "Here you go", "Certainly", or anything similar. Output only the requested content, with no introductions, explanations, or sign-offs unless the user explicitly asks for them.`;

export interface ContentWriterAgentOptions {
	/**
	 * Optional LLM caller. When omitted the agent builds an OpenAI-backed caller
	 * from the input's `providerId`/`apiKey`. Tests inject a fake here.
	 */
	llmCaller?: ContentWriterLlmCaller;
}

/**
 * ContentWriterAgent — single streaming LLM call.
 *
 * No routing, no per-task variants. The user prompt goes in, tokens come
 * out via `text` AgentEvents, and the final string is returned.
 */
export class ContentWriterAgent extends BaseAgent<
	ContentWriterAgentInput,
	ContentWriterAgentOutput
> {
	readonly type = 'content-writer';

	constructor(private readonly options: ContentWriterAgentOptions = {}) {
		super();
	}

	validate(input: ContentWriterAgentInput): void {
		if (!input.prompt?.trim()) throw new AgentValidationError(this.type, 'prompt required');
		if (!input.providerId?.trim())
			throw new AgentValidationError(this.type, 'providerId required');
		if (!input.apiKey?.trim()) throw new AgentValidationError(this.type, 'apiKey required');
		if (!input.modelName?.trim())
			throw new AgentValidationError(this.type, 'modelName required');
	}

	protected async run(
		input: ContentWriterAgentInput,
		ctx: AgentContext
	): Promise<ContentWriterAgentOutput> {
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

	private buildDefaultCaller(input: ContentWriterAgentInput): ContentWriterLlmCaller {
		const client = createOpenAIClient(input.providerId, input.apiKey);
		const timeoutMs = input.perCallTimeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS;
		return new OpenAIContentWriterLlmCaller(client, timeoutMs);
	}
}
