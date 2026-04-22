import type OpenAI from 'openai';
import type { RunBudget, UsageDelta } from './budget';

export type ChatCompletion = OpenAI.Chat.Completions.ChatCompletion;
export type ChatCompletionChunk = OpenAI.Chat.Completions.ChatCompletionChunk;
export type ChatCompletionMessage = OpenAI.Chat.Completions.ChatCompletionMessage;
export type ChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
export type ChatStreamParams = Omit<
	OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
	'stream'
>;

export interface LlmCallOptions {
	client: OpenAI;
	params: ChatParams;
	signal: AbortSignal;
	budget: RunBudget;
	label: string;
	timeoutMs: number;
	maxRetries?: number;
}

export interface StreamChatOptions {
	client: OpenAI;
	params: ChatStreamParams;
	signal: AbortSignal;
	budget: RunBudget;
	label: string;
	timeoutMs: number;
	/** Invoked for each content delta as it arrives from the model. */
	onContentDelta?: (delta: string) => void;
}

const DEFAULT_MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8_000;

/**
 * callChat — single-shot chat completion with retry, timeout, and usage accounting.
 *
 * Retries on transient errors (429, 5xx, network). Per-call timeout is
 * composed with the caller signal so cancellation still wins. Usage is
 * charged to the run budget; `checkOrThrow` is the caller's responsibility
 * between steps.
 */
export async function callChat(opts: LlmCallOptions): Promise<ChatCompletion> {
	const { client, params, signal, budget, label, timeoutMs } = opts;
	const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
	let attempt = 0;
	let lastError: unknown;

	while (attempt <= maxRetries) {
		if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
		const timeoutController = new AbortController();
		const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
		const merged = mergeSignals(signal, timeoutController.signal);

		try {
			const response = await client.chat.completions.create(params, { signal: merged });
			budget.charge(usageFrom(response));
			return response;
		} catch (error) {
			lastError = error;
			if (isAbortError(error) && signal.aborted) throw error;
			if (!isRetryable(error) || attempt === maxRetries) {
				throw decorate(error, label, attempt);
			}
			await sleep(backoffFor(attempt), signal);
			attempt += 1;
		} finally {
			clearTimeout(timer);
		}
	}
	throw decorate(lastError, label, attempt);
}

function usageFrom(response: ChatCompletion): UsageDelta {
	const usage = response.usage;
	return {
		inputTokens: usage?.prompt_tokens ?? 0,
		outputTokens: usage?.completion_tokens ?? 0,
	};
}

/**
 * streamChat — streaming chat completion.
 *
 * Consumes the SSE stream from OpenAI-compatible providers, invokes
 * `onContentDelta` for each content chunk, accumulates tool-call
 * fragments, and returns a `ChatCompletion`-shaped aggregate so callers
 * can reuse the same post-processing as `callChat`.
 *
 * Usage accounting requires `stream_options.include_usage = true`,
 * which this function enables automatically. No retry/backoff — the
 * caller should fall back to `callChat` for idempotent re-attempts.
 */
export async function streamChat(opts: StreamChatOptions): Promise<ChatCompletion> {
	const { client, params, signal, budget, label, timeoutMs, onContentDelta } = opts;
	if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

	const timeoutController = new AbortController();
	const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
	const merged = mergeSignals(signal, timeoutController.signal);

	try {
		const stream = await client.chat.completions.create(
			{ ...params, stream: true, stream_options: { include_usage: true } },
			{ signal: merged }
		);

		const aggregator = new StreamAggregator();
		for await (const chunk of stream) {
			aggregator.ingest(chunk, onContentDelta);
		}

		const completion = aggregator.finalize(params.model);
		budget.charge(usageFrom(completion));
		return completion;
	} catch (error) {
		if (isAbortError(error) && signal.aborted) throw error;
		throw decorate(error, label, 0);
	} finally {
		clearTimeout(timer);
	}
}

interface ToolCallAccumulator {
	id?: string;
	type: 'function';
	function: { name: string; arguments: string };
}

class StreamAggregator {
	private content = '';
	private toolCalls = new Map<number, ToolCallAccumulator>();
	private finishReason: ChatCompletion['choices'][number]['finish_reason'] = 'stop';
	private usage: ChatCompletion['usage'];
	private chunkId = '';
	private created = 0;

	ingest(chunk: ChatCompletionChunk, onContentDelta?: (delta: string) => void): void {
		this.chunkId = chunk.id || this.chunkId;
		this.created = chunk.created || this.created;
		if (chunk.usage) {
			this.usage = chunk.usage;
		}
		const choice = chunk.choices?.[0];
		if (!choice) return;
		if (choice.finish_reason) {
			this.finishReason = choice.finish_reason;
		}
		const delta = choice.delta;
		if (delta?.content) {
			this.content += delta.content;
			onContentDelta?.(delta.content);
		}
		if (delta?.tool_calls) {
			for (const tc of delta.tool_calls) {
				const existing = this.toolCalls.get(tc.index) ?? {
					type: 'function' as const,
					function: { name: '', arguments: '' },
				};
				if (tc.id) existing.id = tc.id;
				if (tc.function?.name) existing.function.name = tc.function.name;
				if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
				this.toolCalls.set(tc.index, existing);
			}
		}
	}

	finalize(model: string): ChatCompletion {
		const toolCalls = Array.from(this.toolCalls.entries())
			.sort(([a], [b]) => a - b)
			.map(([, tc]) => ({
				id: tc.id ?? '',
				type: tc.type,
				function: { name: tc.function.name, arguments: tc.function.arguments },
			}));

		const message: ChatCompletionMessage = {
			role: 'assistant',
			content: this.content || null,
			refusal: null,
			...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
		};

		return {
			id: this.chunkId || '',
			object: 'chat.completion',
			created: this.created || Math.floor(Date.now() / 1000),
			model,
			choices: [
				{
					index: 0,
					message,
					finish_reason: this.finishReason,
					logprobs: null,
				},
			],
			usage: this.usage,
		};
	}
}

function isAbortError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	return error.name === 'AbortError' || /abort/i.test(error.message);
}

function isRetryable(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false;
	const record = error as { status?: number; code?: string; name?: string };
	if (record.status === 429) return true;
	if (typeof record.status === 'number' && record.status >= 500 && record.status < 600) return true;
	if (record.code === 'ECONNRESET' || record.code === 'ETIMEDOUT') return true;
	if (record.name === 'APIConnectionError') return true;
	return false;
}

function backoffFor(attempt: number): number {
	const exp = BASE_BACKOFF_MS * 2 ** attempt;
	const jitter = Math.floor(Math.random() * BASE_BACKOFF_MS);
	return Math.min(MAX_BACKOFF_MS, exp + jitter);
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		const onAbort = (): void => {
			clearTimeout(timer);
			reject(new DOMException('Aborted', 'AbortError'));
		};
		if (signal.aborted) {
			clearTimeout(timer);
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		signal.addEventListener('abort', onAbort, { once: true });
	});
}

function mergeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
	if (a.aborted) return a;
	if (b.aborted) return b;
	const controller = new AbortController();
	const forward = (source: AbortSignal): void => {
		if (!controller.signal.aborted) controller.abort(source.reason);
	};
	a.addEventListener('abort', () => forward(a), { once: true });
	b.addEventListener('abort', () => forward(b), { once: true });
	return controller.signal;
}

function decorate(error: unknown, label: string, attempt: number): Error {
	const base = error instanceof Error ? error : new Error(String(error));
	const decorated = new Error(`[${label}] attempt ${attempt + 1}: ${base.message}`);
	decorated.name = base.name;
	decorated.stack = base.stack;
	return decorated;
}
