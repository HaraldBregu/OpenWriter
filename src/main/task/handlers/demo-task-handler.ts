import type { TaskHandler, Emit } from '../task-handler';
import type { LoggerService } from '../../services/logger';

export interface DemoTaskInput {
	prompt: string;
}

const STATE_DELAY_MS = 500;
const TOKEN_DELAY_MS = 80;
const LOG_SOURCE = 'DemoTaskHandler';

const LOREM =
	'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

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

		const tokens = tokenize(LOREM);
		let result = '';
		for (const token of tokens) {
			await sleep(TOKEN_DELAY_MS, signal);
			result += token;
			emit({ state: 'running', data: token });
		}

		emit({ state: 'finished', data: result });
		await sleep(STATE_DELAY_MS, signal);

		emit({ state: 'cancelled', data: 'cancelled' });

		return result;
	}
}
