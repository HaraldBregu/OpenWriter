import type OpenAI from 'openai';
import type { RunBudget, UsageDelta } from './budget';

export type ChatCompletion = OpenAI.Chat.Completions.ChatCompletion;
export type ChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

export interface LlmCallOptions {
	client: OpenAI;
	params: ChatParams;
	signal: AbortSignal;
	budget: RunBudget;
	label: string;
	timeoutMs: number;
	maxRetries?: number;
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
