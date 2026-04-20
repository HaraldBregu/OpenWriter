import type { TaskHandler, ProgressReporter, StreamReporter } from '../task-handler';

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

	async execute(
		input: DemoTaskInput,
		signal: AbortSignal,
		reporter: ProgressReporter,
		streamReporter?: StreamReporter
	): Promise<DemoTaskOutput> {
		reporter.progress(0, 'Demo running');

		let content = '';
		for (let i = 0; i < STREAM_CHUNKS.length; i++) {
			await sleep(STEP_DELAY_MS, signal);
			const chunk = STREAM_CHUNKS[i];
			content += chunk;
			streamReporter?.stream(chunk);
			const percent = Math.round(((i + 1) / STREAM_CHUNKS.length) * 100);
			reporter.progress(percent, `Streaming ${i + 1}/${STREAM_CHUNKS.length}`);
		}

		return { content: `Prompt received: ${input.prompt}\n\n${content}` };
	}
}
