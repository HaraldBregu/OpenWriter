import {
	ContentWriterTaskHandler,
	type ContentWriterTaskInput,
} from '../../../../../src/main/task/handlers/content-writer-task-handler';
import type { TaskEvent } from '../../../../../src/shared/types';

type EmittedEvent = Omit<TaskEvent, 'taskId' | 'metadata'>;

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

describe('ContentWriterTaskHandler', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('exposes the "content-writer" type identifier', () => {
		const handler = new ContentWriterTaskHandler();
		expect(handler.type).toBe('content-writer');
	});

	it('emits the queued → started → running → finished lifecycle and returns the full draft', async () => {
		const handler = new ContentWriterTaskHandler();
		const { events, emit } = collectEvents();
		const controller = new AbortController();
		const input: ContentWriterTaskInput = { prompt: 'Write a short essay on daily writing' };

		const promise = handler.execute(input, controller.signal, emit);
		await jest.runAllTimersAsync();
		const result = await promise;

		// The first three events must be queued -> started -> started ("Routing prompt...")
		expect(events[0]).toEqual({ state: 'queued', data: 'queued' });
		expect(events[1]).toEqual({ state: 'started', data: 'started' });

		const startedEvents = events.filter((e) => e.state === 'started');
		const runningEvents = events.filter((e) => e.state === 'running');
		const finishedEvents = events.filter((e) => e.state === 'finished');

		// 1 "started" + 3 status messages = 4 started-state events.
		expect(startedEvents).toHaveLength(4);
		expect(startedEvents.map((e) => e.data)).toEqual([
			'started',
			'Routing prompt...',
			'Outlining content...',
			'Drafting body...',
		]);

		// At least one streamed token plus exactly one terminal finished event.
		expect(runningEvents.length).toBeGreaterThan(0);
		expect(finishedEvents).toHaveLength(1);

		// Concatenating the streamed tokens reconstructs the full draft.
		const streamed = runningEvents.map((e) => e.data).join('');
		expect(streamed).toBe(result);
		expect(finishedEvents[0].data).toBe(result);

		// Sanity-check the dummy content shape (markdown heading + body).
		expect(result.startsWith('# ')).toBe(true);
		expect(result).toContain('Daily Writing');
	});

	it('logs the start of execution with prompt length when a logger is provided', async () => {
		const logger = makeLogger();
		const handler = new ContentWriterTaskHandler(logger as unknown as never);
		const { emit } = collectEvents();
		const controller = new AbortController();
		const input: ContentWriterTaskInput = { prompt: 'hi there' };

		const promise = handler.execute(input, controller.signal, emit);
		await jest.runAllTimersAsync();
		await promise;

		expect(logger.info).toHaveBeenCalledWith(
			'ContentWriterTaskHandler',
			'Content-writer task started',
			{ promptLength: 8 }
		);
	});

	it('rejects with an AbortError when the signal is aborted before execution', async () => {
		// Real timers — the handler should reject synchronously from the first sleep().
		jest.useRealTimers();
		const handler = new ContentWriterTaskHandler();
		const { emit } = collectEvents();
		const controller = new AbortController();
		controller.abort();

		await expect(
			handler.execute({ prompt: 'anything' }, controller.signal, emit)
		).rejects.toMatchObject({ name: 'AbortError' });
	});

	it('rejects with an AbortError when the signal is aborted mid-stream', async () => {
		jest.useRealTimers();
		const handler = new ContentWriterTaskHandler();
		const { events, emit } = collectEvents();
		const controller = new AbortController();

		const promise = handler.execute({ prompt: 'go' }, controller.signal, emit);
		// Allow the queued/started lifecycle to fire, then abort before the
		// token stream finishes.
		setTimeout(() => controller.abort(), 50);

		await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
		expect(events[0]).toEqual({ state: 'queued', data: 'queued' });
		// Should not have reached the finished state.
		expect(events.find((e) => e.state === 'finished')).toBeUndefined();
	});
});
