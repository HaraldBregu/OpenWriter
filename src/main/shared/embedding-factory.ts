/**
 * EmbeddingFactory — creates an OpenAIEmbeddings instance configured
 * for the resolved provider.
 *
 * Mirrors the ChatModelFactory pattern: uses OpenAI-compatible API
 * endpoints for all providers, varying only baseURL and apiKey.
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { DEFAULT_EMBEDDING_MODEL_ID } from '../../shared/model-constants';

const DEFAULT_EMBEDDING_MODEL = DEFAULT_EMBEDDING_MODEL_ID;

const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
	openai: undefined,
	anthropic: 'https://api.anthropic.com/v1/',
	google: 'https://generativelanguage.googleapis.com/v1beta/openai/',
	mistral: 'https://api.mistral.ai/v1/',
};

export interface EmbeddingOptions {
	providerId: string;
	apiKey: string;
	model?: string;
}

export function createEmbeddingModel(opts: EmbeddingOptions): OpenAIEmbeddings {
	const { providerId, apiKey, model } = opts;
	const baseURL = PROVIDER_BASE_URLS[providerId];

	return new OpenAIEmbeddings({
		openAIApiKey: apiKey,
		modelName: model ?? DEFAULT_EMBEDDING_MODEL,
		...(baseURL ? { configuration: { baseURL } } : {}),
	});
}
