import {
	ContentWriterTaskHandler,
	type ContentWriterTaskInput,
} from '../../../../../src/main/task/handlers/content-writer-task-handler';
import { ContentWriterAgent } from '../../../../../src/main/agents/content-writer';
import type {
	ContentWriterLlmCaller,
	ContentWriterStreamParams,
} from '../../../../../src/main/agents/content-writer';
import type { TaskEvent } from '../../../../../src/shared/types';

type EmittedEvent = Omit<TaskEvent, 'taskId' | 'metadata'>;

function makeFakeCaller(tokens: string[]): {
	caller: ContentWriterLlmCaller;
	streams: ContentWriterStreamParams[];
} {
	const streams: ContentWriterStreamParams[] = [];
	const caller: ContentWriterLlmCaller = {
		async stream(params, _signal) {
			streams.push(params);
			for (const token of tokens) {
				params.onDelta(token);
			}
			return tokens.join('');
		},
	};
	return { caller, streams };
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

function buildHandler(tokens: string[]): {
	handler: ContentWriterTaskHandler;
	logger: ReturnType<typeof makeLogger>;
	serviceResolver: ReturnType<typeof makeServiceResolver>;
	modelResolver: ReturnType<typeof makeModelResolver>;
	streams: ContentWriterStreamParams[];
} {
	const { caller, streams } = makeFakeCaller(tokens);
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
	return { handler, logger, serviceResolver, modelResolver, streams };
}

describe('ContentWriterTaskHandler', () => {
	it('exposes the "content-writer" type identifier', () => {
		const { handler } = buildHandler(['hi']);
		expect(handler.type).toBe('content-writer');
	});

	it('emits queued → started → running tokens → finished and returns the full content', async () => {
		const { handler } = buildHandler(['Hello', ' ', 'world', '.']);
		const { events, emit } = collectEvents();

		const result = await handler.execute(
			{ prompt: 'say hi' },
			new AbortController().signal,
			emit
		);

		expect(result).toBe('Hello world.');

		expect(events[0]).toEqual({ state: 'queued', data: 'queued' });
		expect(events[1]).toEqual({ state: 'started', data: 'started' });

		const runningEvents = events.filter((e) => e.state === 'running');
		expect(runningEvents.map((e) => e.data)).toEqual(['Hello', ' ', 'world', '.']);

		const finished = events.filter((e) => e.state === 'finished');
		expect(finished).toHaveLength(1);
		expect(finished[0].data).toBe('Hello world.');
	});

	it('passes the resolved provider/api key/model through to the agent', async () => {
		const { handler, streams, serviceResolver, modelResolver } = buildHandler(['ok']);
		const { emit } = collectEvents();

		await handler.execute(
			{ prompt: 'go', providerId: 'openai', modelId: 'gpt-test' },
			new AbortController().signal,
			emit
		);

		expect(serviceResolver.resolve).toHaveBeenCalledWith({ providerId: 'openai' });
		expect(modelResolver.resolve).toHaveBeenCalledWith({ modelId: 'gpt-test' });
		expect(streams[0].modelName).toBe('gpt-test');
		expect(streams[0].userPrompt).toBe('go');
	});

	it('logs the start of execution with the prompt length', async () => {
		const { handler, logger } = buildHandler(['ok']);
		const { emit } = collectEvents();

		await handler.execute({ prompt: 'hi there' }, new AbortController().signal, emit);

		expect(logger.info).toHaveBeenCalledWith(
			'ContentWriterTaskHandler',
			'Content-writer task started',
			{ promptLength: 8 }
		);
	});

	it('rejects with an AbortError when the signal is already aborted', async () => {
		const { handler } = buildHandler(['ok']);
		const { emit } = collectEvents();
		const controller = new AbortController();
		controller.abort();

		await expect(
			handler.execute({ prompt: 'anything' }, controller.signal, emit)
		).rejects.toMatchObject({ name: 'AbortError' });
	});

	it('surfaces validation errors from the agent (missing apiKey)', async () => {
		const { caller } = makeFakeCaller(['ok']);
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
