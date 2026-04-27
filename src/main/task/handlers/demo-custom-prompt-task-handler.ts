import type { TaskHandler, Emit } from '../task-handler';
import type { LoggerService } from '../../services/logger';
import type { TaskState } from '../../../shared/types';

export interface DemoCustomPromptTaskInput {
	text: string;
	prompt: string;
}

const STATE_DELAY_MS = 100;
const TOKEN_DELAY_MS = 20;
const LOG_SOURCE = 'DemoCustomPromptTaskHandler';

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

export class DemoCustomPromptTaskHandler
	implements TaskHandler<DemoCustomPromptTaskInput, string>
{
	readonly type = 'demo-custom-prompt';

	constructor(private readonly logger?: LoggerService) {}

	async execute(
		input: DemoCustomPromptTaskInput,
		signal: AbortSignal,
		emit: Emit
	): Promise<string> {
		this.logger?.info(LOG_SOURCE, 'Demo custom-prompt task started', {
			textLength: input.text.length,
			promptLength: input.prompt.length,
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

		logAndEmit({ state: 'started', data: 'Reading instruction...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Applying prompt...' });
		await sleep(STATE_DELAY_MS, signal);

		const generated = `[Prompt: ${input.prompt}]\n\n${input.text}`;
		const tokens = tokenize(generated);
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
