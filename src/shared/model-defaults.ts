// ---------------------------------------------------------------------------
// Shared model types & seeded defaults
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

export interface CreateModelInput {
	provider: string;
	apikey: string;
	baseurl: string;
}

export interface ModelConfig extends CreateModelInput {
	id: string;
}

export const DEFAULT_MODELS: readonly CreateModelInput[] = [
	{ provider: 'anthropic', apikey: '', baseurl: '' },
	{ provider: 'openai', apikey: '', baseurl: '' },
	{ provider: 'google', apikey: '', baseurl: '' },
	{ provider: 'mistral', apikey: '', baseurl: '' },
] as const;

function slugify(segment: string): string {
	return segment
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function hashModelIdentity(value: string): string {
	let hash = 2166136261;

	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return (hash >>> 0).toString(36);
}

export function createModelId(
	model: Pick<CreateModelInput, 'provider' | 'apikey' | 'baseurl'>,
	index: number
): string {
	return `model-${slugify(model.provider)}-${index}-${hashModelIdentity(
		[model.provider, model.baseurl, model.apikey].join('\u0000')
	)}`;
}

export function toModelConfig(model: CreateModelInput, index: number): ModelConfig {
	return {
		id: createModelId(model, index),
		...model,
	};
}
