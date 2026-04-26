import type { TaskHandler, Emit } from '../task-handler';
import type { LoggerService } from '../../services/logger';

export interface DemoPostGeneratorTaskInput {
	topic: string;
}

const STATE_DELAY_MS = 100;
const TOKEN_DELAY_MS = 20;
const LOG_SOURCE = 'DemoPostGeneratorTaskHandler';

const POST_TEXT = `# Five Small Habits That Actually Stick

Most advice about habits sounds great in theory and falls apart by Wednesday. After a few years of trial and error — and a lot of abandoned streaks — these are the five that finally stuck for me.

## 1. Anchor it to something you already do

Don't add a new habit to an empty slot in your day. Glue it to an existing one: stretch while the kettle boils, journal right after you brush your teeth, review tomorrow's calendar as you close your laptop.

## 2. Make the first step embarrassingly small

"Read for 30 minutes" is a goal. "Open the book" is a habit. The smaller the entry point, the less willpower you spend getting started — and starting is almost always the hardest part.

## 3. Track it, but don't grade it

A simple checkmark beats a detailed log. The point isn't to measure progress; it's to make the habit visible to yourself. Once you can see the streak, you stop wanting to break it.

## 4. Plan for the bad days

The day you skip is the day the habit lives or dies. Decide *in advance* what your "minimum viable version" looks like — one push-up, one paragraph, one minute — so a bad day doesn't turn into a broken chain.

## 5. Review on Sundays

Spend five minutes each week looking at what worked and what didn't. Not to judge yourself, just to notice. Habits that survive aren't the ones you force; they're the ones you keep adjusting until they fit your actual life.

---

**TL;DR:** stack new habits on old ones, start tiny, make them visible, plan for bad days, and review weekly. Boring? Yes. That's the point.`;

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

export class DemoPostGeneratorTaskHandler
	implements TaskHandler<DemoPostGeneratorTaskInput, string>
{
	readonly type = 'demo-post-generator';

	constructor(private readonly logger?: LoggerService) {}

	async execute(
		input: DemoPostGeneratorTaskInput,
		signal: AbortSignal,
		emit: Emit
	): Promise<string> {
		this.logger?.info(LOG_SOURCE, 'Demo post-generator task started', {
			topicLength: input.topic.length,
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

		logAndEmit({ state: 'started', data: 'Brainstorming angles...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Outlining sections...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Drafting headline...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Writing post...' });
		await sleep(STATE_DELAY_MS, signal);

		const tokens = tokenize(POST_TEXT);
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
