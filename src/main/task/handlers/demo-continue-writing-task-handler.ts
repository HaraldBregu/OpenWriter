import type { TaskHandler, Emit } from '../task-handler';
import type { LoggerService } from '../../services/logger';

export interface DemoContinueWritingTaskInput {
	text: string;
}

const STATE_DELAY_MS = 100;
const TOKEN_DELAY_MS = 20;
const LOG_SOURCE = 'DemoContinueWritingTaskHandler';

const CONTINUATION_TEXT = ` The path twisted between the pines, narrower than she remembered, and the late sun broke through the canopy in long, slanted bars. Each step pushed the silence a little further back, until even her own breathing felt loud against the hush of the forest.

She paused at the edge of the clearing. Somewhere ahead, water was moving — not the rush of a river, but the slow, deliberate trickle of something smaller, something hidden. She listened for a long moment, and then, almost without deciding to, she stepped forward into the open.`;

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

export class DemoContinueWritingTaskHandler
	implements TaskHandler<DemoContinueWritingTaskInput, string>
{
	readonly type = 'demo-continue-writing';

	constructor(private readonly logger?: LoggerService) {}

	async execute(
		input: DemoContinueWritingTaskInput,
		signal: AbortSignal,
		emit: Emit
	): Promise<string> {
		this.logger?.info(LOG_SOURCE, 'Demo continue-writing task started', {
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

		logAndEmit({ state: 'started', data: 'Reading context...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Picking up tone and voice...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Drafting continuation...' });
		await sleep(STATE_DELAY_MS, signal);

		const tokens = tokenize(CONTINUATION_TEXT);
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
