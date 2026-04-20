/**
 * EmbeddingFactory — creates an EmbeddingModel instance backed by the OpenAI SDK.
 *
 * Mirrors the ChatModelFactory pattern: uses OpenAI-compatible API
 * endpoints for all providers, varying only baseURL and apiKey.
 */

import OpenAI from 'openai';
import type { EmbeddingModel } from './ai-types';
import { DEFAULT_EMBEDDING_MODEL_ID } from '../../shared/models';

const DEFAULT_EMBEDDING_MODEL = DEFAULT_EMBEDDING_MODEL_ID;

const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
	openai: undefined,
	anthropic: 'https://api.anthropic.com/v1/',
};

export interface EmbeddingOptions {
	providerId: string;
	apiKey: string;
	model?: string;
}

export function createEmbeddingModel(opts: EmbeddingOptions): EmbeddingModel {
	const { apiKey, model } = opts;
	const baseURL = PROVIDER_BASE_URLS[opts.providerId];
	const modelName = model ?? DEFAULT_EMBEDDING_MODEL;

	const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });

	async function embed(input: string[]): Promise<number[][]> {
		const response = await client.embeddings.create({ model: modelName, input });
		return response.data
			.sort((a, b) => a.index - b.index)
			.map((item) => item.embedding);
	}

	return {
		async embedDocuments(texts: string[]): Promise<number[][]> {
			if (texts.length === 0) return [];
			return embed(texts);
		},
		async embedQuery(text: string): Promise<number[]> {
			const [vector] = await embed([text]);
			return vector;
		},
	};
}
