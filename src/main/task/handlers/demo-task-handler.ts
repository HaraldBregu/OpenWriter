import type { TaskHandler, ProgressReporter, RecordEvent } from '../task-handler';
import type { LoggerService } from '../../services/logger';

export interface DemoTaskInput {
	prompt: string;
}

export interface DemoTaskOutput {
	content: string;
}

const PHASES = ['Reasoning...', 'Checking intent of request...', 'Picking skill...'];
const PHASE_DELAY_MS = 500;
const TOKEN_DELAY_MS = 100;
const LOG_SOURCE = 'DemoTaskHandler';

const LOREM =
	'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

function tokenize(text: string): string[] {
	const matches = text.match(/\S+\s*/g);
	return matches ?? [];
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

export class DemoTaskHandler implements TaskHandler<DemoTaskInput, DemoTaskOutput> {
	readonly type = 'demo';

	constructor(private readonly logger?: LoggerService) {}

	async execute(
		input: DemoTaskInput,
		signal: AbortSignal,
		reporter: ProgressReporter,
		_metadata?: Record<string, unknown>,
		recordEvent?: RecordEvent
	): Promise<DemoTaskOutput> {
		const startedAt = Date.now();
		this.logger?.info(LOG_SOURCE, 'Demo task started', { promptLength: input.prompt.length });

		try {
			for (const label of PHASES) {
				await sleep(PHASE_DELAY_MS, signal);
				reporter.progress(0, label);
				recordEvent?.({ kind: 'phase', at: Date.now(), payload: { label } });
			}

			const tokens = tokenize(LOREM);
			let content = '';
			for (let i = 0; i < tokens.length; i++) {
				await sleep(TOKEN_DELAY_MS, signal);
				const token = tokens[i];
				content += token;
				recordEvent?.({ kind: 'text', at: Date.now(), payload: { text: token } });
				const percent = Math.round(((i + 1) / tokens.length) * 100);
				reporter.progress(percent, 'Writing...');
			}

			this.logger?.info(LOG_SOURCE, 'Demo task completed', {
				elapsedMs: Date.now() - startedAt,
				tokens: tokens.length,
				outputLength: content.length,
			});
			return { content };
		} catch (error) {
			this.logger?.error(LOG_SOURCE, 'Demo task failed', {
				elapsedMs: Date.now() - startedAt,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}
}
