import type { TaskHandler, Emit } from '../task-handler';
import type { LoggerService } from '../../services/logger';

export interface DemoTaskInput {
	prompt: string;
}

const STATE_DELAY_MS = 500;
const LOG_SOURCE = 'DemoTaskHandler';

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

export class DemoTaskHandler implements TaskHandler<DemoTaskInput, string> {
	readonly type = 'demo';

	constructor(private readonly logger?: LoggerService) {}

	async execute(input: DemoTaskInput, signal: AbortSignal, emit: Emit): Promise<string> {
		this.logger?.info(LOG_SOURCE, 'Demo task started', { promptLength: input.prompt.length });

		emit({ state: 'queued', data: 'queued' });
		await sleep(STATE_DELAY_MS, signal);

		emit({ state: 'started', data: 'started' });
		await sleep(STATE_DELAY_MS, signal);

		emit({ state: 'started', data: 'Reasoning...' });
		await sleep(STATE_DELAY_MS, signal);

		emit({ state: 'started', data: 'Routing request...' });
		await sleep(STATE_DELAY_MS, signal);

		emit({ state: 'started', data: 'Deciding intent...' });
		await sleep(STATE_DELAY_MS, signal);

		emit({ state: 'started', data: 'Selecting skill...' });
		await sleep(STATE_DELAY_MS, signal);

		emit({ state: 'started', data: 'Calling tool...' });
		await sleep(STATE_DELAY_MS, signal);

		emit({ state: 'started', data: 'Synthesizing answer...' });
		await sleep(STATE_DELAY_MS, signal);

		emit({ state: 'running', data: 'running' });
		await sleep(STATE_DELAY_MS, signal);

		const result = `demo: ${input.prompt}`;
		emit({ state: 'finished', data: result });
		await sleep(STATE_DELAY_MS, signal);

		emit({ state: 'cancelled', data: 'cancelled' });

		return result;
	}
}
