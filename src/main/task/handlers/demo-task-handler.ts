import type { TaskHandler, ProgressReporter, StreamReporter } from '../task-handler';
import type { LoggerService } from '../../services/logger';

export interface DemoTaskInput {
	prompt: string;
}

export interface DemoTaskOutput {
	content: string;
}

const STREAM_CHUNKS = [
	'Demo task started.\n',
	'Simulating streamed tokens ',
	'chunk-by-chunk ',
	'until completion. ',
	'\nDone.',
];

const STEP_DELAY_MS = 400;
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
		reporter: ProgressReporter,
		streamReporter?: StreamReporter
	): Promise<DemoTaskOutput> {
		const startedAt = Date.now();
		this.logger?.info(LOG_SOURCE, 'Demo task started', { promptLength: input.prompt.length });
		reporter.progress(0, 'Demo running');

		try {
			let content = '';
			for (let i = 0; i < STREAM_CHUNKS.length; i++) {
				await sleep(STEP_DELAY_MS, signal);
				const chunk = STREAM_CHUNKS[i];
				content += chunk;
				streamReporter?.stream(chunk);
				const percent = Math.round(((i + 1) / STREAM_CHUNKS.length) * 100);
				reporter.progress(percent, `Streaming ${i + 1}/${STREAM_CHUNKS.length}`);
			}

			const output: DemoTaskOutput = {
				content: `Prompt received: ${input.prompt}\n\n${content}`,
			};
			this.logger?.info(LOG_SOURCE, 'Demo task completed', {
				elapsedMs: Date.now() - startedAt,
				chunks: STREAM_CHUNKS.length,
				outputLength: output.content.length,
			});
			return output;
		} catch (error) {
			this.logger?.error(LOG_SOURCE, 'Demo task failed', {
				elapsedMs: Date.now() - startedAt,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}
}
