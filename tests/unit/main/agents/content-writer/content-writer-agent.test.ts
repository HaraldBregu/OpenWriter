import { ContentWriterAgent } from '../../../../../src/main/agents/content-writer';
import type {
	ContentWriterAgentInput,
	ContentWriterCallParams,
	ContentWriterLlmCaller,
	ContentWriterRoute,
	ContentWriterStreamParams,
} from '../../../../../src/main/agents/content-writer';
import type {
	AgentContext,
	AgentEvent,
} from '../../../../../src/main/agents/core';
import { AgentValidationError } from '../../../../../src/main/agents/core';

interface FakeCallerOptions {
	route: ContentWriterRoute;
	routerReasoning?: string;
	tokens?: string[];
}

interface FakeCallerSpy {
	caller: ContentWriterLlmCaller;
	calls: ContentWriterCallParams[];
	streams: ContentWriterStreamParams[];
}

function buildFakeCaller(opts: FakeCallerOptions): FakeCallerSpy {
	const tokens = opts.tokens ?? ['Hello', ', ', 'world.'];
	const calls: ContentWriterCallParams[] = [];
	const streams: ContentWriterStreamParams[] = [];

	const caller: ContentWriterLlmCaller = {
		async call(params, signal) {
			calls.push(params);
			if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
			return JSON.stringify({
				route: opts.route,
				reasoning: opts.routerReasoning ?? `picked ${opts.route}`,
			});
		},
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

	return { caller, calls, streams };
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

const baseInput: ContentWriterAgentInput = {
	prompt: 'Write something for me',
	providerId: 'openai',
	apiKey: 'sk-test',
	modelName: 'gpt-test',
};

describe('ContentWriterAgent', () => {
	it('exposes the "content-writer" type identifier', () => {
		const agent = new ContentWriterAgent();
		expect(agent.type).toBe('content-writer');
	});

	describe('validate', () => {
		const cases: Array<{ field: string; input: ContentWriterAgentInput }> = [
			{ field: 'prompt', input: { ...baseInput, prompt: '   ' } },
			{ field: 'providerId', input: { ...baseInput, providerId: '' } },
			{ field: 'apiKey', input: { ...baseInput, apiKey: '' } },
			{ field: 'modelName', input: { ...baseInput, modelName: '' } },
		];

		it.each(cases)('throws AgentValidationError when $field is missing', async ({ input }) => {
			const { caller } = buildFakeCaller({ route: 'short' });
			const agent = new ContentWriterAgent({ llmCaller: caller });
			const controller = new AbortController();
			const { ctx } = buildContext(controller.signal);
			await expect(agent.execute(input, ctx)).rejects.toBeInstanceOf(AgentValidationError);
		});
	});

	describe('routing and generation', () => {
		const routes: ContentWriterRoute[] = ['short', 'grammar', 'long'];

		it.each(routes)('routes the request to the %s node and returns its output', async (route) => {
			const { caller, calls, streams } = buildFakeCaller({
				route,
				tokens: ['piece-', 'one-', 'two'],
			});
			const agent = new ContentWriterAgent({ llmCaller: caller });
			const controller = new AbortController();
			const { ctx, events } = buildContext(controller.signal);

			const out = await agent.execute(baseInput, ctx);

			expect(out.route).toBe(route);
			expect(out.routing.route).toBe(route);
			expect(out.routing.reasoning).toBe(`picked ${route}`);
			expect(out.content).toBe('piece-one-two');
			expect(out.stoppedReason).toBe('done');

			// Exactly one router call (JSON-schema constrained), one streaming call.
			expect(calls).toHaveLength(1);
			expect(calls[0].jsonSchema?.name).toBe('content_writer_route');
			expect(streams).toHaveLength(1);

			// Each route uses a distinct system prompt.
			const sys = streams[0].systemPrompt;
			if (route === 'short') expect(sys).toMatch(/short, focused text/i);
			if (route === 'grammar') expect(sys).toMatch(/proofreader/i);
			if (route === 'long') expect(sys).toMatch(/long-form/i);

			// Route event was emitted before generation tokens.
			const routeIdx = events.findIndex((e) => e.kind === 'route');
			const firstTextIdx = events.findIndex((e) => e.kind === 'text');
			expect(routeIdx).toBeGreaterThan(-1);
			expect(firstTextIdx).toBeGreaterThan(routeIdx);
		});

		it('forwards existing text into the grammar node user prompt', async () => {
			const { caller, streams } = buildFakeCaller({ route: 'grammar', tokens: ['ok'] });
			const agent = new ContentWriterAgent({ llmCaller: caller });
			const controller = new AbortController();
			const { ctx } = buildContext(controller.signal);

			await agent.execute(
				{ ...baseInput, prompt: 'fix grammar', existingText: 'I has a apple' },
				ctx
			);

			expect(streams[0].userPrompt).toContain('Text to correct:');
			expect(streams[0].userPrompt).toContain('I has a apple');
		});
	});

	describe('state management', () => {
		it('emits idle → routing → generating → completed in order', async () => {
			const { caller } = buildFakeCaller({ route: 'short' });
			const agent = new ContentWriterAgent({ llmCaller: caller });
			const controller = new AbortController();
			const { ctx, events } = buildContext(controller.signal);

			const out = await agent.execute(baseInput, ctx);

			const stateEvents = events.filter((e) => e.kind === 'state');
			const phases = stateEvents.map(
				(e) => (e.payload as { phase: string }).phase
			);
			expect(phases).toEqual(['routing', 'generating', 'completed']);

			// Final snapshot reflects the completed state on the chosen route.
			expect(out.state).toEqual({ phase: 'completed', route: 'short' });

			// Routing event has no route yet; generating/completed carry the route.
			const stateRoutes = stateEvents.map(
				(e) => (e.payload as { route: ContentWriterRoute | null }).route
			);
			expect(stateRoutes).toEqual([null, 'short', 'short']);
		});

		it('streams text deltas as text events', async () => {
			const { caller } = buildFakeCaller({
				route: 'long',
				tokens: ['a-', 'b-', 'c'],
			});
			const agent = new ContentWriterAgent({ llmCaller: caller });
			const controller = new AbortController();
			const { ctx, events } = buildContext(controller.signal);

			await agent.execute(baseInput, ctx);

			const textEvents = events.filter((e) => e.kind === 'text');
			expect(textEvents.map((e) => (e.payload as { text: string }).text)).toEqual([
				'a-',
				'b-',
				'c',
			]);
		});
	});

	describe('cancellation', () => {
		it('rejects with AbortError when the signal is aborted before run', async () => {
			const { caller } = buildFakeCaller({ route: 'short' });
			const agent = new ContentWriterAgent({ llmCaller: caller });
			const controller = new AbortController();
			controller.abort();
			const { ctx } = buildContext(controller.signal);

			await expect(agent.execute(baseInput, ctx)).rejects.toMatchObject({ name: 'AbortError' });
		});

		it('propagates abort raised by the LLM caller', async () => {
			const caller: ContentWriterLlmCaller = {
				async call() {
					throw new DOMException('Aborted', 'AbortError');
				},
				async stream() {
					throw new Error('should not stream');
				},
			};
			const agent = new ContentWriterAgent({ llmCaller: caller });
			const controller = new AbortController();
			const { ctx } = buildContext(controller.signal);

			await expect(agent.execute(baseInput, ctx)).rejects.toMatchObject({ name: 'AbortError' });
		});
	});

	describe('schema parsing', () => {
		it('throws when the router returns an unknown route', async () => {
			const caller: ContentWriterLlmCaller = {
				async call() {
					return JSON.stringify({ route: 'medium', reasoning: 'nope' });
				},
				async stream() {
					return '';
				},
			};
			const agent = new ContentWriterAgent({ llmCaller: caller });
			const controller = new AbortController();
			const { ctx } = buildContext(controller.signal);

			await expect(agent.execute(baseInput, ctx)).rejects.toThrow(/Invalid route/);
		});
	});
});
