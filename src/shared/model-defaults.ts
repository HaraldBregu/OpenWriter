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

export interface SeededModel extends CreateModelInput {
	default: boolean;
}

export interface ModelConfig extends SeededModel {
	id: string;
}

export const DEFAULT_MODELS: readonly SeededModel[] = [
	{
		provider: 'anthropic',
		model: 'claude-opus-4-6',
		apikey: '',
		baseurl: '',
		default: false,
	},
	{
		provider: 'openai',
		model: 'gpt-4o',
		apikey: '',
		baseurl: '',
		default: true,
	},
	{
		provider: 'google',
		model: 'gemini-2-0-pro',
		apikey: '',
		baseurl: '',
		default: false,
	},
	{
		provider: 'mistral',
		model: 'mistral-large-2',
		apikey: '',
		baseurl: '',
		default: false,
	},
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
	model: Pick<SeededModel, 'provider' | 'model' | 'apikey' | 'baseurl'>,
	index: number
): string {
	return `model-${slugify(model.provider)}-${slugify(model.model)}-${index}-${hashModelIdentity(
		[model.provider, model.model, model.baseurl, model.apikey].join('\u0000')
	)}`;
}

export function toModelConfig(model: SeededModel, index: number): ModelConfig {
	return {
		id: createModelId(model, index),
		...model,
	};
}
