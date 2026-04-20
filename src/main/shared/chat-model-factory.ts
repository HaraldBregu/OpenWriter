/**
 * ChatModelFactory — creates a ChatModel instance backed by the OpenAI SDK.
 *
 * Uses OpenAI-compatible API endpoints for all providers, varying only
 * `baseURL` and `apiKey`.
 */

import OpenAI from 'openai';
import type { ChatModel, ChatMessage } from './ai-types';
import { isReasoningModel } from './ai-utils';

const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
	openai: undefined,
	anthropic: 'https://api.anthropic.com/v1/',
};

export interface ChatModelOptions {
	providerId: string;
	apiKey: string;
	modelName: string;
	streaming: boolean;
	temperature?: number;
	maxTokens?: number;
}

export function createChatModel(opts: ChatModelOptions): ChatModel {
	const { apiKey, modelName, temperature, maxTokens } = opts;
	const baseURL = PROVIDER_BASE_URLS[opts.providerId];
	const effectiveTemp = isReasoningModel(modelName) ? undefined : temperature;

	const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });

	const model: ChatModel = {
		_tokenListener: null,

		async invoke(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
			const response = await client.chat.completions.create(
				{
					model: modelName,
					messages: messages.map((m) => ({ role: m.role, content: m.content })),
					...(effectiveTemp !== undefined ? { temperature: effectiveTemp } : {}),
					...(maxTokens ? { max_tokens: maxTokens } : {}),
				},
				signal ? { signal } : undefined
			);
			return response.choices[0]?.message?.content ?? '';
		},

		async *stream(messages: ChatMessage[], signal?: AbortSignal): AsyncGenerator<string> {
			const response = await client.chat.completions.create(
				{
					model: modelName,
					messages: messages.map((m) => ({ role: m.role, content: m.content })),
					...(effectiveTemp !== undefined ? { temperature: effectiveTemp } : {}),
					...(maxTokens ? { max_tokens: maxTokens } : {}),
					stream: true,
				},
				signal ? { signal } : undefined
			);

			for await (const chunk of response) {
				if (signal?.aborted) break;
				const token = chunk.choices[0]?.delta?.content;
				if (token) {
					model._tokenListener?.(token);
					yield token;
				}
			}
		},
	};

	return model;
}
