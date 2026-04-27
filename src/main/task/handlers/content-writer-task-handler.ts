import type { TaskHandler, Emit } from '../task-handler';
import type { LoggerService } from '../../services/logger';

export interface ContentWriterTaskInput {
	prompt: string;
}

const STATE_DELAY_MS = 100;
const TOKEN_DELAY_MS = 20;
const LOG_SOURCE = 'ContentWriterTaskHandler';

const CONTENT_DRAFT = `# The Quiet Power of Daily Writing

Writing every day is less about producing finished work and more about **keeping a channel open**. A few sentences before breakfast, a paragraph at lunch, a half-page before bed — these small acts add up. They keep the inner editor quiet long enough for real thinking to surface.

## Why Routine Beats Inspiration

Inspiration is unreliable. Some mornings the words arrive easily; on others they refuse to show up at all. A routine sidesteps the question entirely. *You write because it is the time to write*, not because you feel like it. Over weeks, that shift produces something inspiration alone never can: consistency.

- A fixed time of day removes one decision.
- A fixed length removes another.
- A fixed place removes a third.

By the time you sit down, the only remaining question is what to say.

## A Simple Practice

1. Pick a window of twenty minutes.
2. Open the same file every day.
3. Write until the timer ends, then stop — even mid-sentence.

The mid-sentence stop is the trick. It gives tomorrow a running start.

## What Changes Over Time

After a month of this, two things tend to happen. First, the prose gets cleaner: <u>less throat-clearing</u>, fewer hedges, a stronger sense of where each paragraph is going. Second, the mind starts composing in the background. Ideas arrive while you walk, while you wait in line, while you do the dishes — already half-formed, ready to be set down.

That is the real return on the practice. The pages you produce are a side effect; the **habit of noticing** is the point.`;

function tokenize(text: string): string[] {
	return text.match(/\S+\s*/g) ?? [];
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
			return;
		}
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		const onAbort = (): void => {
			clearTimeout(timer);
			reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
		};
		signal.addEventListener('abort', onAbort, { once: true });
	});
}

/**
 * Task handler that demonstrates the content-writer agent surface.
 *
 * Mirrors the streaming shape the real `ContentWriterAgent` will produce —
 * routing → generation → completion — without making LLM calls. Useful for
 * wiring renderer UI against the task pipeline before the agent is online.
 */
export class ContentWriterTaskHandler
	implements TaskHandler<ContentWriterTaskInput, string>
{
	readonly type = 'content-writer';

	constructor(private readonly logger?: LoggerService) {}

	async execute(
		input: ContentWriterTaskInput,
		signal: AbortSignal,
		emit: Emit
	): Promise<string> {
		this.logger?.info(LOG_SOURCE, 'Content-writer task started', {
			promptLength: input.prompt.length,
		});

		const logAndEmit: Emit = (update) => {
			if (update.state !== 'running') {
				const payload =
					update.state === 'finished' ? `length=${update.data.length}` : update.data;
				this.logger?.info(LOG_SOURCE, `state=${update.state}`, { data: payload });
			}
			emit(update);
		};

		logAndEmit({ state: 'queued', data: 'queued' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'started' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Routing prompt...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Outlining content...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Drafting body...' });
		await sleep(STATE_DELAY_MS, signal);

		const tokens = tokenize(CONTENT_DRAFT);
		let result = '';
		for (const token of tokens) {
			await sleep(TOKEN_DELAY_MS, signal);
			result += token;
			logAndEmit({ state: 'running', data: token });
		}

		logAndEmit({ state: 'finished', data: result });

		return result;
	}
}
