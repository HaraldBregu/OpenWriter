import { ContentReviewerAgent } from '../../../../../src/main/agents/content-reviewer';
import type {
	ContentReviewerAgentInput,
	ContentReviewerLlmCaller,
	ContentReviewerStreamParams,
} from '../../../../../src/main/agents/content-reviewer';
import type { AgentContext, AgentEvent } from '../../../../../src/main/agents/core';
import { AgentValidationError } from '../../../../../src/main/agents/core';

function buildFakeCaller(tokens: string[] = ['Hello', ', ', 'world.']): {
	caller: ContentReviewerLlmCaller;
	streams: ContentReviewerStreamParams[];
} {
	const streams: ContentReviewerStreamParams[] = [];
	const caller: ContentReviewerLlmCaller = {
		async stream(params, signal) {
			streams.push(params);
			let combined = '';
			for (const token of tokens) {
				if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
				params.onDelta(token);
				combined += token;
			}
			return combined;
		},
	};
	return { caller, streams };
}

function buildContext(signal: AbortSignal): {
	ctx: AgentContext;
	events: AgentEvent[];
} {
	const events: AgentEvent[] = [];
	const logger = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	};
	const ctx: AgentContext = {
		signal,
		logger: logger as unknown as AgentContext['logger'],
		onEvent: (event) => events.push(event),
	};
	return { ctx, events };
}

const baseInput: ContentReviewerAgentInput = {
	prompt: 'Review this draft for me',
	providerId: 'openai',
	apiKey: 'sk-test',
	modelName: 'gpt-test',
};

describe('ContentReviewerAgent', () => {
	it('exposes the "content-reviewer" type identifier', () => {
		const agent = new ContentReviewerAgent();
		expect(agent.type).toBe('content-reviewer');
	});

	describe('validate', () => {
		const cases: Array<{ field: string; input: ContentReviewerAgentInput }> = [
			{ field: 'prompt', input: { ...baseInput, prompt: '   ' } },
			{ field: 'providerId', input: { ...baseInput, providerId: '' } },
			{ field: 'apiKey', input: { ...baseInput, apiKey: '' } },
			{ field: 'modelName', input: { ...baseInput, modelName: '' } },
		];

		it.each(cases)('throws AgentValidationError when $field is missing', async ({ input }) => {
			const { caller } = buildFakeCaller();
			const agent = new ContentReviewerAgent({ llmCaller: caller });
			const controller = new AbortController();
			const { ctx } = buildContext(controller.signal);
			await expect(agent.execute(input, ctx)).rejects.toBeInstanceOf(AgentValidationError);
		});
	});

	it('streams the LLM response and returns the joined content', async () => {
		const { caller, streams } = buildFakeCaller(['piece-', 'one-', 'two']);
		const agent = new ContentReviewerAgent({ llmCaller: caller });
		const controller = new AbortController();
		const { ctx, events } = buildContext(controller.signal);

		const out = await agent.execute(baseInput, ctx);

		expect(out).toEqual({ content: 'piece-one-two' });
		expect(streams).toHaveLength(1);
		expect(streams[0].modelName).toBe('gpt-test');
		expect(streams[0].userPrompt).toBe(baseInput.prompt);

		const textTokens = events
			.filter((e) => e.kind === 'text')
			.map((e) => (e.payload as { text: string }).text);
		expect(textTokens).toEqual(['piece-', 'one-', 'two']);
	});

	it('forwards temperature and maxTokens to the LLM caller', async () => {
		const { caller, streams } = buildFakeCaller(['ok']);
		const agent = new ContentReviewerAgent({ llmCaller: caller });
		const controller = new AbortController();
		const { ctx } = buildContext(controller.signal);

		await agent.execute({ ...baseInput, temperature: 0.7, maxTokens: 500 }, ctx);

		expect(streams[0].temperature).toBe(0.7);
		expect(streams[0].maxTokens).toBe(500);
	});

	describe('cancellation', () => {
		it('rejects with AbortError when the signal is aborted before run', async () => {
			const { caller } = buildFakeCaller();
			const agent = new ContentReviewerAgent({ llmCaller: caller });
			const controller = new AbortController();
			controller.abort();
			const { ctx } = buildContext(controller.signal);

			await expect(agent.execute(baseInput, ctx)).rejects.toMatchObject({ name: 'AbortError' });
		});

		it('propagates abort raised by the LLM caller', async () => {
			const caller: ContentReviewerLlmCaller = {
				async stream() {
					throw new DOMException('Aborted', 'AbortError');
				},
			};
			const agent = new ContentReviewerAgent({ llmCaller: caller });
			const controller = new AbortController();
			const { ctx } = buildContext(controller.signal);

			await expect(agent.execute(baseInput, ctx)).rejects.toMatchObject({ name: 'AbortError' });
		});
	});
});
