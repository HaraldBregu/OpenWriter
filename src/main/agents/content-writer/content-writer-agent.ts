import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { createOpenAIClient } from '../../shared/chat-model-factory';
import { OpenAIContentWriterLlmCaller } from './llm-call';
import { GrammarFixNode, LongTextNode, RouterNode, ShortTextNode } from './nodes';
import type {
	ContentWriterAgentInput,
	ContentWriterAgentOutput,
	ContentWriterLlmCaller,
	ContentWriterRoute,
	ContentWriterState,
} from './types';

const DEFAULT_PER_CALL_TIMEOUT_MS = 90_000;

export interface ContentWriterAgentOptions {
	/**
	 * Optional LLM caller. When omitted the agent builds an OpenAI-backed caller
	 * from the input's `providerId`/`apiKey`. Tests inject a fake here.
	 */
	llmCaller?: ContentWriterLlmCaller;
}

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
		const state = new StateMachine((next) =>
			ctx.onEvent?.({ kind: 'state', at: Date.now(), payload: { ...next } })
		);

		const router = new RouterNode({ llmCaller: caller });

		state.transition({ phase: 'routing', route: null });
		this.ensureNotAborted(ctx.signal);
		const routing = await router.route(input, ctx.signal);
		ctx.onEvent?.({ kind: 'route', at: Date.now(), payload: routing });

		state.transition({ phase: 'generating', route: routing.route });
		this.ensureNotAborted(ctx.signal);
		const content = await this.generate(routing.route, input, caller, ctx);

		state.transition({ phase: 'completed', route: routing.route });

		return {
			content,
			route: routing.route,
			routing,
			state: state.snapshot(),
			stoppedReason: 'done',
		};
	}

	private async generate(
		route: ContentWriterRoute,
		input: ContentWriterAgentInput,
		caller: ContentWriterLlmCaller,
		ctx: AgentContext
	): Promise<string> {
		const onDelta = (delta: string): void =>
			ctx.onEvent?.({ kind: 'text', at: Date.now(), payload: { text: delta } });

		switch (route) {
			case 'short':
				return new ShortTextNode({ llmCaller: caller }).write(input, ctx.signal, onDelta);
			case 'grammar':
				return new GrammarFixNode({ llmCaller: caller }).write(input, ctx.signal, onDelta);
			case 'long':
				return new LongTextNode({ llmCaller: caller }).write(input, ctx.signal, onDelta);
		}
	}

	private buildDefaultCaller(input: ContentWriterAgentInput): ContentWriterLlmCaller {
		const client = createOpenAIClient(input.providerId, input.apiKey);
		const timeoutMs = input.perCallTimeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS;
		return new OpenAIContentWriterLlmCaller(client, timeoutMs);
	}
}

class StateMachine {
	private state: ContentWriterState = { phase: 'idle', route: null };

	constructor(private readonly onChange: (next: ContentWriterState) => void) {}

	transition(next: ContentWriterState): void {
		if (!isValidTransition(this.state, next)) {
			throw new Error(
				`Invalid content-writer state transition: ${this.state.phase} → ${next.phase}`
			);
		}
		this.state = next;
		this.onChange(next);
	}

	snapshot(): ContentWriterState {
		return { ...this.state };
	}
}

function isValidTransition(from: ContentWriterState, to: ContentWriterState): boolean {
	if (from.phase === 'idle') return to.phase === 'routing';
	if (from.phase === 'routing') return to.phase === 'generating' && to.route !== null;
	if (from.phase === 'generating')
		return to.phase === 'completed' && to.route === from.route;
	return false;
}

/**
 * Internal helpers re-exported solely for unit tests inside this folder.
 *
 * Not part of the public agent surface — do not import from outside this module.
 */
export const __internal__ = { StateMachine, isValidTransition };
