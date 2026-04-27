import type { TaskHandler, Emit } from '../task-handler';
import type { LoggerService } from '../../services/logger';

export interface DemoTaskInput {
	prompt: string;
}

const STATE_DELAY_MS = 100;
const TOKEN_DELAY_MS = 20;
const LOG_SOURCE = 'DemoTaskHandler';

const LOREM_IPSUM_LONG = `# Lorem Ipsum Dolor Sit Amet

Lorem ipsum dolor sit amet, **consectetur adipiscing elit**. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, *quis nostrud exercitation* ullamco laboris nisi ut aliquip ex ea commodo consequat.

## Duis Aute Irure

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat <u>cupidatat non proident</u>, sunt in culpa qui officia deserunt mollit anim id est laborum.

### Sed Ut Perspiciatis

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia ~~voluptas sit aspernatur~~ aut odit aut fugit.

#### Neque Porro Quisquam

Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.

##### Ut Enim Ad Minima

Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.

###### Quis Autem Vel

Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.

## Unordered List

- **Lorem ipsum** dolor sit amet
- *Consectetur adipiscing* elit
- <u>Sed do eiusmod</u> tempor incididunt
- ~~Ut labore et dolore~~ magna aliqua
- Ut enim ad ***minim veniam***

## Ordered List

1. First item: **bold emphasis** in text
2. Second item: *italic emphasis* in text
3. Third item: <u>underlined section</u> here
4. Fourth item: ~~strikethrough text~~ shown
5. Fifth item: combined ***bold italic*** form

### Nested List

- Parent item one
  - Child with **bold**
  - Child with *italic*
- Parent item two
  - Child with <u>underline</u>
  - Child with ~~strikethrough~~

## At Vero Eos

At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint **occaecati cupiditate** non provident, similique sunt in culpa qui officia deserunt *mollitia animi*, id est laborum et dolorum fuga.

Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est <u>eligendi optio</u> cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, ~~omnis dolor repellendus~~.

## Temporibus Autem

Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus ***asperiores repellat***.`;

const LOREM = LOREM_IPSUM_LONG;

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

	constructor(private readonly logger?: LoggerService) { }

	async execute(input: DemoTaskInput, signal: AbortSignal, emit: Emit): Promise<string> {
		this.logger?.info(LOG_SOURCE, 'Demo task started', { promptLength: input.prompt.length });

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

		logAndEmit({ state: 'started', data: 'Reasoning...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Routing request...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Deciding intent...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Selecting skill...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Calling tool...' });
		await sleep(STATE_DELAY_MS, signal);

		logAndEmit({ state: 'started', data: 'Synthesizing answer...' });
		await sleep(STATE_DELAY_MS, signal);

		const tokens = tokenize(LOREM);
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
