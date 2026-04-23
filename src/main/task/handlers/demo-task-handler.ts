import type { TaskHandler, Emit } from '../task-handler';
import type { LoggerService } from '../../services/logger';

export interface DemoTaskInput {
	prompt: string;
}

export interface DemoTaskOutput {
	content: string;
}

const STATE_DELAY_MS = 300;
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

export class DemoTaskHandler implements TaskHandler<DemoTaskInput, DemoTaskOutput> {
	readonly type = 'demo';

	constructor(private readonly logger?: LoggerService) {}

	async execute(
		input: DemoTaskInput,
		signal: AbortSignal,
		emit: Emit
	): Promise<DemoTaskOutput> {
		this.logger?.info(LOG_SOURCE, 'Demo task started', { promptLength: input.prompt.length });

		emit({ state: 'queued', data: {}, error: null });
		await sleep(STATE_DELAY_MS, signal);

		emit({ state: 'started', data: {}, error: null });
		await sleep(STATE_DELAY_MS, signal);

		emit({ state: 'running', data: { percent: 50, message: 'working' }, error: null });
		await sleep(STATE_DELAY_MS, signal);

		const content = `demo: ${input.prompt}`;

		emit({
			state: 'completed',
			data: { result: { content }, durationMs: STATE_DELAY_MS * 3 },
			error: null,
		});
		await sleep(STATE_DELAY_MS, signal);

		emit({ state: 'cancelled', data: {}, error: null });
		await sleep(STATE_DELAY_MS, signal);

		emit({
			state: 'error',
			data: null,
			error: { message: 'demo error example', code: 'DEMO_ERROR' },
		});

		return { content };
	}
}
