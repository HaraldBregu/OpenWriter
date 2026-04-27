import {
	ContentWriterTaskHandler,
	type ContentWriterTaskInput,
} from '../../../../../src/main/task/handlers/content-writer-task-handler';
import { ContentWriterAgent } from '../../../../../src/main/agents/content-writer';
import type {
	ContentWriterCallParams,
	ContentWriterLlmCaller,
	ContentWriterRoute,
	ContentWriterStreamParams,
} from '../../../../../src/main/agents/content-writer';
import type { TaskEvent } from '../../../../../src/shared/types';

type EmittedEvent = Omit<TaskEvent, 'taskId' | 'metadata'>;

interface FakeCallerOptions {
	route: ContentWriterRoute;
	tokens: string[];
	reasoning?: string;
}

function makeFakeCaller(opts: FakeCallerOptions): {
	caller: ContentWriterLlmCaller;
	streamCalls: ContentWriterStreamParams[];
	jsonCalls: ContentWriterCallParams[];
} {
	const streamCalls: ContentWriterStreamParams[] = [];
	const jsonCalls: ContentWriterCallParams[] = [];
	const caller: ContentWriterLlmCaller = {
		async call(params, _signal) {
			jsonCalls.push(params);
			return JSON.stringify({
				route: opts.route,
				reasoning: opts.reasoning ?? `routing to ${opts.route}`,
			});
		},
		async stream(params, _signal) {
			streamCalls.push(params);
			for (const token of opts.tokens) {
				params.onDelta(token);
			}
			return opts.tokens.join('');
		},
	};
	return { caller, streamCalls, jsonCalls };
}

function makeLogger(): {
	info: jest.Mock;
	warn: jest.Mock;
	error: jest.Mock;
	debug: jest.Mock;
} {
	return {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	};
}

function makeServiceResolver(overrides?: {
	providerId?: string;
	apiKey?: string;
}): { resolve: jest.Mock } {
	return {
		resolve: jest.fn().mockReturnValue({
			provider: { id: overrides?.providerId ?? 'openai', name: 'OpenAI' },
			apiKey: overrides?.apiKey ?? 'sk-test',
		}),
	};
}

function makeModelResolver(modelId = 'gpt-test'): { resolve: jest.Mock } {
	return {
		resolve: jest.fn().mockReturnValue({
			providerId: 'openai',
			modelId,
			name: modelId,
			type: 'text',
			contextWindow: 128_000,
			maxOutputTokens: 4_096,
		}),
	};
}

function collectEvents(): {
	events: EmittedEvent[];
	emit: (event: EmittedEvent) => void;
} {
	const events: EmittedEvent[] = [];
	return {
		events,
		emit: (event) => {
			events.push(event);
		},
	};
}

function buildHandler(callerOpts: FakeCallerOptions): {
	handler: ContentWriterTaskHandler;
	logger: ReturnType<typeof makeLogger>;
	serviceResolver: ReturnType<typeof makeServiceResolver>;
	modelResolver: ReturnType<typeof makeModelResolver>;
	streamCalls: ContentWriterStreamParams[];
	jsonCalls: ContentWriterCallParams[];
} {
	const { caller, streamCalls, jsonCalls } = makeFakeCaller(callerOpts);
	const agent = new ContentWriterAgent({ llmCaller: caller });
	const logger = makeLogger();
	const serviceResolver = makeServiceResolver();
	const modelResolver = makeModelResolver();
	const handler = new ContentWriterTaskHandler({
		agent,
		serviceResolver: serviceResolver as never,
		modelResolver: modelResolver as never,
		logger: logger as never,
	});
	return { handler, logger, serviceResolver, modelResolver, streamCalls, jsonCalls };
}

describe('ContentWriterTaskHandler', () => {
	it('exposes the "content-writer" type identifier', () => {
		const { handler } = buildHandler({ route: 'short', tokens: ['hi'] });
		expect(handler.type).toBe('content-writer');
	});

	it('drives the agent through the routing → generating → finished lifecycle (short route)', async () => {
		const { handler } = buildHandler({
			route: 'short',
			tokens: ['Hello', ' ', 'world', '.'],
		});
		const { events, emit } = collectEvents();

		const result = await handler.execute(
			{ prompt: 'say hi' },
			new AbortController().signal,
			emit
		);

		expect(result).toBe('Hello world.');

		// First two task events are the handler's own queued/started markers.
		expect(events[0]).toEqual({ state: 'queued', data: 'queued' });
		expect(events[1]).toEqual({ state: 'started', data: 'started' });

		// Lifecycle: routing → route announcement → drafting label → tokens → finished.
		const startedEvents = events.filter((e) => e.state === 'started');
		expect(startedEvents.map((e) => e.data)).toEqual([
			'started',
			'Routing prompt...',
			'Route: short',
			'Drafting short copy...',
		]);

		const runningEvents = events.filter((e) => e.state === 'running');
		expect(runningEvents.map((e) => e.data)).toEqual(['Hello', ' ', 'world', '.']);

		const finished = events.filter((e) => e.state === 'finished');
		expect(finished).toHaveLength(1);
		expect(finished[0].data).toBe('Hello world.');
	});

	it('uses the route-specific status label for grammar and long routes', async () => {
		const grammar = buildHandler({ route: 'grammar', tokens: ['Fixed.'] });
		const long = buildHandler({ route: 'long', tokens: ['Long answer.'] });

		const { events: grammarEvents, emit: emitG } = collectEvents();
		const { events: longEvents, emit: emitL } = collectEvents();

		await grammar.handler.execute(
			{ prompt: 'fix this', existingText: 'Their is an error.' },
			new AbortController().signal,
			emitG
		);
		await long.handler.execute(
			{ prompt: 'write a long piece' },
			new AbortController().signal,
			emitL
		);

		expect(grammarEvents.filter((e) => e.state === 'started').map((e) => e.data)).toEqual([
			'started',
			'Routing prompt...',
			'Route: grammar',
			'Polishing grammar...',
		]);
		expect(longEvents.filter((e) => e.state === 'started').map((e) => e.data)).toEqual([
			'started',
			'Routing prompt...',
			'Route: long',
			'Drafting long-form content...',
		]);
	});

	it('passes the resolved provider/api key/model through to the agent input', async () => {
		const { handler, jsonCalls, streamCalls, serviceResolver, modelResolver } = buildHandler({
			route: 'short',
			tokens: ['ok'],
		});
		const { emit } = collectEvents();

		await handler.execute(
			{ prompt: 'go', providerId: 'openai', modelId: 'gpt-test' },
			new AbortController().signal,
			emit
		);

		expect(serviceResolver.resolve).toHaveBeenCalledWith({ providerId: 'openai' });
		expect(modelResolver.resolve).toHaveBeenCalledWith({ modelId: 'gpt-test' });
		// The router call uses the resolved modelName.
		expect(jsonCalls[0].modelName).toBe('gpt-test');
		expect(streamCalls[0].modelName).toBe('gpt-test');
	});

	it('forwards existingText to the router context for grammar fixes', async () => {
		const { handler, jsonCalls } = buildHandler({ route: 'grammar', tokens: ['ok'] });
		const { emit } = collectEvents();

		await handler.execute(
			{ prompt: 'fix grammar', existingText: 'this are wrong' },
			new AbortController().signal,
			emit
		);

		// Router receives the existingText embedded in its userPrompt.
		expect(jsonCalls[0].userPrompt).toContain('this are wrong');
	});

	it('logs the start of execution with the prompt length', async () => {
		const { handler, logger } = buildHandler({ route: 'short', tokens: ['ok'] });
		const { emit } = collectEvents();

		await handler.execute({ prompt: 'hi there' }, new AbortController().signal, emit);

		expect(logger.info).toHaveBeenCalledWith(
			'ContentWriterTaskHandler',
			'Content-writer task started',
			{ promptLength: 8 }
		);
	});

	it('rejects with an AbortError when the signal is already aborted', async () => {
		const { handler } = buildHandler({ route: 'short', tokens: ['ok'] });
		const { emit } = collectEvents();
		const controller = new AbortController();
		controller.abort();

		await expect(
			handler.execute({ prompt: 'anything' }, controller.signal, emit)
		).rejects.toMatchObject({ name: 'AbortError' });
	});

	it('surfaces validation errors from the agent (missing apiKey)', async () => {
		const { caller } = makeFakeCaller({ route: 'short', tokens: ['ok'] });
		const agent = new ContentWriterAgent({ llmCaller: caller });
		const handler = new ContentWriterTaskHandler({
			agent,
			serviceResolver: {
				resolve: () => ({ provider: { id: 'openai', name: 'OpenAI' }, apiKey: '' }),
			} as never,
			modelResolver: makeModelResolver() as never,
			logger: makeLogger() as never,
		});
		const { emit } = collectEvents();

		await expect(
			handler.execute({ prompt: 'go' }, new AbortController().signal, emit)
		).rejects.toThrow(/apiKey required/);
	});
});
