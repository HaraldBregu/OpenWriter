import type { TaskHandler, Emit } from '../task-handler';
import type { LoggerService } from '../../services/logger';
import type { TaskState } from '../../../shared/types';

export interface DemoImproveWritingTaskInput {
	text: string;
}

const STATE_DELAY_MS = 100;
const TOKEN_DELAY_MS = 20;
const LOG_SOURCE = 'DemoImproveWritingTaskHandler';

const IMPROVED_TEXT = `The path wound between the pines, narrower than she remembered, and the late sun pushed through the canopy in long, slanted bars. Each step nudged the silence back a little further, until even her breathing felt loud against the hush of the forest.

At the edge of the clearing she stopped. Somewhere ahead, water was moving — not the rush of a river, but the slow, deliberate trickle of something smaller and half hidden. She listened for a long moment, then, almost without deciding to, stepped forward into the open.`;

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

export class DemoImproveWritingTaskHandler
	implements TaskHandler<DemoImproveWritingTaskInput, string>
{
	readonly type = 'demo-improve-writing';

	constructor(private readonly logger?: LoggerService) {}

	async execute(
		input: DemoImproveWritingTaskInput,
		signal: AbortSignal,
		emit: Emit
	): Promise<string> {
		this.logger?.info(LOG_SOURCE, 'Demo improve-writing task started', {
			textLength: input.text.length,
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

		logAndEmit({ state: 'started', data: 'Reading passage...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Tightening phrasing...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Polishing prose...' });
		await sleep(STATE_DELAY_MS, signal);

		const tokens = tokenize(IMPROVED_TEXT);
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
