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

function makeFailingCaller(message: string): ContentWriterLlmCaller {
	return {
		async stream() {
			throw new Error(message);
		},
	};
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

function buildHandler(opts: {
	caller: ContentWriterLlmCaller;
	serviceResolver?: ReturnType<typeof makeServiceResolver>;
	modelResolver?: ReturnType<typeof makeModelResolver>;
}): {
	handler: ContentWriterTaskHandler;
	logger: ReturnType<typeof makeLogger>;
	serviceResolver: ReturnType<typeof makeServiceResolver>;
	modelResolver: ReturnType<typeof makeModelResolver>;
} {
	const agent = new ContentWriterAgent({ llmCaller: opts.caller });
	const logger = makeLogger();
	const serviceResolver = opts.serviceResolver ?? makeServiceResolver();
	const modelResolver = opts.modelResolver ?? makeModelResolver();
	const handler = new ContentWriterTaskHandler({
		agent,
		serviceResolver: serviceResolver as never,
		modelResolver: modelResolver as never,
		logger: logger as never,
	});
	return { handler, logger, serviceResolver, modelResolver };
}

function buildSuccessHandler(tokens: string[]): {
	handler: ContentWriterTaskHandler;
	logger: ReturnType<typeof makeLogger>;
	serviceResolver: ReturnType<typeof makeServiceResolver>;
	modelResolver: ReturnType<typeof makeModelResolver>;
	streams: ContentWriterStreamParams[];
} {
	const { caller, streams } = makeFakeCaller(tokens);
	const built = buildHandler({ caller });
	return { ...built, streams };
}

describe('ContentWriterTaskHandler', () => {
	it('exposes the "content-writer" type identifier', () => {
		const { handler } = buildSuccessHandler(['hi']);
		expect(handler.type).toBe('content-writer');
	});

	it('emits queued → started → running → finished as success-wrapped TaskEvents', async () => {
		const { handler } = buildSuccessHandler(['Hello', ' ', 'world', '.']);
		const { events, emit } = collectEvents();

		const result = await handler.execute(
			{ prompt: 'say hi' },
			new AbortController().signal,
			emit
		);

		expect(result).toBe('Hello world.');

		// First two task events: queued, started — both wrapped in {success:true,data}.
		expect(events[0]).toEqual({ state: 'queued', data: { success: true, data: 'queued' } });
		expect(events[1]).toEqual({ state: 'started', data: { success: true, data: 'started' } });

		const running = events.filter((e) => e.state === 'running');
		expect(running.map((e) => e.data)).toEqual([
			{ success: true, data: 'Hello' },
			{ success: true, data: ' ' },
			{ success: true, data: 'world' },
			{ success: true, data: '.' },
		]);

		const finished = events.filter((e) => e.state === 'finished');
		expect(finished).toHaveLength(1);
		expect(finished[0]).toEqual({
			state: 'finished',
			data: { success: true, data: 'Hello world.' },
		});
	});

	it('passes the resolved provider/api key/model through to the agent', async () => {
		const { handler, streams, serviceResolver, modelResolver } = buildSuccessHandler(['ok']);
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
		const { handler, logger } = buildSuccessHandler(['ok']);
		const { emit } = collectEvents();

		await handler.execute({ prompt: 'hi there' }, new AbortController().signal, emit);

		expect(logger.info).toHaveBeenCalledWith(
			'ContentWriterTaskHandler',
			'Content-writer task started',
			{ promptLength: 8 }
		);
	});

	describe('error handling', () => {
		it('rethrows AbortError without logging it as a failure', async () => {
			const { handler, logger } = buildSuccessHandler(['ok']);
			const { emit } = collectEvents();
			const controller = new AbortController();
			controller.abort();

			await expect(
				handler.execute({ prompt: 'anything' }, controller.signal, emit)
			).rejects.toMatchObject({ name: 'AbortError' });

			expect(logger.error).not.toHaveBeenCalled();
			// Aborts log a neutral info line, not an error.
			expect(logger.info).toHaveBeenCalledWith(
				'ContentWriterTaskHandler',
				'Content-writer task aborted'
			);
		});

		it('logs and rethrows when the agent throws a non-Abort error', async () => {
			const { handler, logger } = buildHandler({
				caller: makeFailingCaller('upstream model exploded'),
			});
			const { emit } = collectEvents();

			await expect(
				handler.execute({ prompt: 'go' }, new AbortController().signal, emit)
			).rejects.toThrow(/upstream model exploded/);

			expect(logger.error).toHaveBeenCalledWith(
				'ContentWriterTaskHandler',
				'Content-writer task failed',
				{ error: 'upstream model exploded' }
			);
		});

		it('does not emit a cancelled TaskEvent itself — that is the executor’s job', async () => {
			// We let the executor own the IPC cancelled emission (with the typed
			// failure envelope). The handler only logs and rethrows, so consumers
			// don't see a duplicate cancelled event for the same error.
			const { handler } = buildHandler({
				caller: makeFailingCaller('boom'),
			});
			const { events, emit } = collectEvents();

			await expect(
				handler.execute({ prompt: 'go' }, new AbortController().signal, emit)
			).rejects.toThrow(/boom/);

			expect(events.find((e) => e.state === 'cancelled')).toBeUndefined();
		});

		it('surfaces validation errors from the agent (missing apiKey) and logs them', async () => {
			const { caller } = makeFakeCaller(['ok']);
			const logger = makeLogger();
			const handler = new ContentWriterTaskHandler({
				agent: new ContentWriterAgent({ llmCaller: caller }),
				serviceResolver: {
					resolve: () => ({ provider: { id: 'openai', name: 'OpenAI' }, apiKey: '' }),
				} as never,
				modelResolver: makeModelResolver() as never,
				logger: logger as never,
			});
			const { emit } = collectEvents();

			await expect(
				handler.execute({ prompt: 'go' }, new AbortController().signal, emit)
			).rejects.toThrow(/apiKey required/);

			expect(logger.error).toHaveBeenCalledWith(
				'ContentWriterTaskHandler',
				'Content-writer task failed',
				expect.objectContaining({ error: expect.stringMatching(/apiKey required/) })
			);
		});
	});

	it('emits a clean lifecycle even for trivial inputs', async () => {
		// Sanity-check that ContentWriterTaskInput accepts just `{prompt}`.
		const { handler } = buildSuccessHandler(['x']);
		const { events, emit } = collectEvents();
		const input: ContentWriterTaskInput = { prompt: 'p' };

		await handler.execute(input, new AbortController().signal, emit);

		expect(events.map((e) => e.state)).toEqual(['queued', 'started', 'running', 'finished']);
		for (const event of events) {
			expect(event.data).toEqual({ success: true, data: expect.any(String) });
		}
	});
});
