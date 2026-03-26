// ---------------------------------------------------------------------------
// Shared model types
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

export interface ServiceProvider {
	provider: string;
	apikey: string;
	baseurl: string;
}

export interface ProviderConfig extends ServiceProvider {
	id: string;
}

// Backward-compatible aliases (deprecated).
export type CreateProviderInput = ServiceProvider;
export type CreateModelInput = ServiceProvider;
export type ModelConfig = ProviderConfig;

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

export function createProviderId(
	provider: Pick<ServiceProvider, 'provider' | 'apikey' | 'baseurl'>,
	index: number
): string {
	return `model-${slugify(provider.provider)}-${index}-${hashModelIdentity(
		[provider.provider, provider.baseurl, provider.apikey].join('\u0000')
	)}`;
}

export function toProviderConfig(provider: ServiceProvider, index: number): ProviderConfig {
	return {
		id: createProviderId(provider, index),
		...provider,
	};
}

// Backward-compatible aliases (deprecated).
export const createModelId = createProviderId;
export const toModelConfig = toProviderConfig;
