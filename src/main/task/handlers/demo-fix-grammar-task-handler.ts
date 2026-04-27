import type { TaskHandler, Emit } from '../task-handler';
import type { LoggerService } from '../../services/logger';
import type { TaskState } from '../../../shared/types';

export interface DemoFixGrammarTaskInput {
	text: string;
}

const STATE_DELAY_MS = 100;
const TOKEN_DELAY_MS = 20;
const LOG_SOURCE = 'DemoFixGrammarTaskHandler';

const FIXED_TEXT = `The quick brown fox jumps over the lazy dog. Despite the rain, she decided to walk to the store because she needed fresh bread and milk for breakfast.

Yesterday I went to the library and borrowed three books about ancient history. Their content was fascinating, and I read late into the night. Tomorrow I am planning to return them and pick up a few more.

If you are not sure which option to choose, please let me know and I will explain the differences. There are too many factors to consider in a single message, so a short call might be easier.`;

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

export class DemoFixGrammarTaskHandler
	implements TaskHandler<DemoFixGrammarTaskInput, string>
{
	readonly type = 'demo-fix-grammar';

	constructor(private readonly logger?: LoggerService) {}

	async execute(
		input: DemoFixGrammarTaskInput,
		signal: AbortSignal,
		emit: Emit
	): Promise<string> {
		this.logger?.info(LOG_SOURCE, 'Demo fix-grammar task started', {
			textLength: input.text.length,
		});

		const logAndEmit = (update: { state: TaskState; data: string }): void => {
			if (update.state !== 'running') {
				const payload =
					update.state === 'finished' ? `length=${update.data.length}` : update.data;
				this.logger?.info(LOG_SOURCE, `state=${update.state}`, { data: payload });
			}
			emit({ state: update.state, data: { success: true, data: update.data } });
		};

		logAndEmit({ state: 'queued', data: 'queued' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'started' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Scanning text...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Detecting grammar issues...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Applying corrections...' });
		await sleep(STATE_DELAY_MS, signal);

		const tokens = tokenize(FIXED_TEXT);
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
