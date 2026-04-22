import type OpenAI from 'openai';

export type ChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
export type ChatStreamParams = Omit<
	OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
	'stream'
>;

interface CallOpts {
	client: OpenAI;
	params: ChatParams;
	signal: AbortSignal;
	timeoutMs: number;
}

interface StreamOpts {
	client: OpenAI;
	params: ChatStreamParams;
	signal: AbortSignal;
	timeoutMs: number;
	onDelta: (delta: string) => void;
}

export async function callChat(opts: CallOpts): Promise<string> {
	const merged = withTimeout(opts.signal, opts.timeoutMs);
	try {
		const response = await opts.client.chat.completions.create(opts.params, {
			signal: merged.signal,
		});
		return response.choices[0]?.message?.content ?? '';
	} finally {
		merged.clear();
	}
}

export async function streamChat(opts: StreamOpts): Promise<string> {
	const merged = withTimeout(opts.signal, opts.timeoutMs);
	try {
		const stream = await opts.client.chat.completions.create(
			{ ...opts.params, stream: true },
			{ signal: merged.signal }
		);
		let content = '';
		for await (const chunk of stream) {
			if (opts.signal.aborted) throw new DOMException('Aborted', 'AbortError');
			const delta = chunk.choices[0]?.delta?.content;
			if (!delta) continue;
			content += delta;
			opts.onDelta(delta);
		}
		return content;
	} finally {
		merged.clear();
	}
}

function withTimeout(signal: AbortSignal, timeoutMs: number): { signal: AbortSignal; clear: () => void } {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	const onAbort = (): void => controller.abort(signal.reason);
	if (signal.aborted) controller.abort(signal.reason);
	else signal.addEventListener('abort', onAbort, { once: true });
	return {
		signal: controller.signal,
		clear: () => {
			clearTimeout(timer);
			signal.removeEventListener('abort', onAbort);
		},
	};
}
