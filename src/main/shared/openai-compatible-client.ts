import { isReasoningModel } from './ai-utils';
import type { ResolvedProvider } from './provider-resolver';

const DEFAULT_PROVIDER_BASE_URLS: Record<string, string | undefined> = {
	openai: 'https://api.openai.com/v1',
	anthropic: 'https://api.anthropic.com/v1',
	google: 'https://generativelanguage.googleapis.com/v1beta/openai',
	meta: 'https://api.llama.com/compat/v1',
	mistral: 'https://api.mistral.ai/v1',
};

export interface OpenAICompatibleMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface OpenAICompatibleChatOptions {
	provider: ResolvedProvider;
	messages: OpenAICompatibleMessage[];
	temperature?: number;
	maxTokens?: number;
	signal?: AbortSignal;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function resolveBaseUrl(provider: ResolvedProvider): string {
	const baseUrl =
		provider.baseUrl?.trim() ||
		DEFAULT_PROVIDER_BASE_URLS[provider.providerId] ||
		'https://api.openai.com/v1';

	return baseUrl.replace(/\/+$/, '');
}

function buildEndpoint(provider: ResolvedProvider): string {
	const baseUrl = resolveBaseUrl(provider);
	return baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
}

function textFromContent(content: unknown): string {
	if (typeof content === 'string') {
		return content;
	}

	if (!Array.isArray(content)) {
		return '';
	}

	return content
		.map((part) => {
			if (typeof part === 'string') {
				return part;
			}

			if (!isRecord(part)) {
				return '';
			}

			if (typeof part['text'] === 'string') {
				return part['text'];
			}

			if (isRecord(part['text']) && typeof part['text']['value'] === 'string') {
				return part['text']['value'];
			}

			return '';
		})
		.join('');
}

function buildRequestBody(
	options: OpenAICompatibleChatOptions,
	stream: boolean
): Record<string, unknown> {
	const body: Record<string, unknown> = {
		model: options.provider.modelName,
		messages: options.messages,
		stream,
	};

	if (!isReasoningModel(options.provider.modelName) && options.temperature !== undefined) {
		body['temperature'] = options.temperature;
	}

	if (options.maxTokens !== undefined) {
		body['max_tokens'] = options.maxTokens;
	}

	return body;
}

async function readErrorMessage(response: Response): Promise<string> {
	const fallback = `${response.status} ${response.statusText}`.trim();

	try {
		const rawText = await response.text();
		if (!rawText.trim()) {
			return fallback;
		}

		try {
			const parsed = JSON.parse(rawText) as unknown;
			if (isRecord(parsed) && isRecord(parsed['error']) && typeof parsed['error']['message'] === 'string') {
				return `${fallback}: ${parsed['error']['message']}`;
			}
		} catch {
			return `${fallback}: ${rawText}`;
		}

		return `${fallback}: ${rawText}`;
	} catch {
		return fallback;
	}
}

function extractCompletionText(payload: unknown): string {
	if (!isRecord(payload) || !Array.isArray(payload['choices']) || payload['choices'].length === 0) {
		return '';
	}

	const firstChoice = payload['choices'][0];
	if (!isRecord(firstChoice)) {
		return '';
	}

	const message = firstChoice['message'];
	if (!isRecord(message)) {
		return '';
	}

	return textFromContent(message['content']);
}

function extractStreamText(payload: unknown): string {
	if (!isRecord(payload) || !Array.isArray(payload['choices']) || payload['choices'].length === 0) {
		return '';
	}

	const firstChoice = payload['choices'][0];
	if (!isRecord(firstChoice)) {
		return '';
	}

	if (isRecord(firstChoice['delta'])) {
		return textFromContent(firstChoice['delta']['content']);
	}

	if (isRecord(firstChoice['message'])) {
		return textFromContent(firstChoice['message']['content']);
	}

	return '';
}

function parseSseEvent(rawEvent: string): string | undefined {
	const lines = rawEvent
		.split('\n')
		.map((line) => line.trimEnd())
		.filter((line) => line.startsWith('data:'));

	if (lines.length === 0) {
		return undefined;
	}

	return lines.map((line) => line.slice(5).trimStart()).join('\n');
}

export async function completeOpenAICompatibleChat(
	options: OpenAICompatibleChatOptions
): Promise<string> {
	const response = await fetch(buildEndpoint(options.provider), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${options.provider.apiKey}`,
		},
		body: JSON.stringify(buildRequestBody(options, false)),
		signal: options.signal,
	});

	if (!response.ok) {
		throw new Error(await readErrorMessage(response));
	}

	const payload = (await response.json()) as unknown;
	return extractCompletionText(payload);
}

export async function* streamOpenAICompatibleChat(
	options: OpenAICompatibleChatOptions
): AsyncGenerator<string> {
	const response = await fetch(buildEndpoint(options.provider), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'text/event-stream',
			Authorization: `Bearer ${options.provider.apiKey}`,
		},
		body: JSON.stringify(buildRequestBody(options, true)),
		signal: options.signal,
	});

	if (!response.ok) {
		throw new Error(await readErrorMessage(response));
	}

	if (!response.body) {
		throw new Error('AI request failed: missing response body');
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	while (true) {
		const { value, done } = await reader.read();
		buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');

		let boundaryIndex = buffer.indexOf('\n\n');
		while (boundaryIndex >= 0) {
			const rawEvent = buffer.slice(0, boundaryIndex);
			buffer = buffer.slice(boundaryIndex + 2);

			const data = parseSseEvent(rawEvent);
			if (data === '[DONE]') {
				return;
			}

			if (data) {
				const payload = JSON.parse(data) as unknown;
				const token = extractStreamText(payload);
				if (token) {
					yield token;
				}
			}

			boundaryIndex = buffer.indexOf('\n\n');
		}

		if (done) {
			break;
		}
	}

	const trailingEvent = parseSseEvent(buffer.trim());
	if (!trailingEvent || trailingEvent === '[DONE]') {
		return;
	}

	const trailingPayload = JSON.parse(trailingEvent) as unknown;
	const trailingToken = extractStreamText(trailingPayload);
	if (trailingToken) {
		yield trailingToken;
	}
}
