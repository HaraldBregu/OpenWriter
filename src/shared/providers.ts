// ---------------------------------------------------------------------------
// Shared AI Provider Constants — Provider Catalogue & Service Providers
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts (main, renderer, preload).
// ---------------------------------------------------------------------------

import type { ProviderDescriptor, ProviderId, ServiceProvider } from './types';

// ---------------------------------------------------------------------------
// Provider IDs
// ---------------------------------------------------------------------------

export const PROVIDER_IDS: readonly ProviderId[] = [
	'openai',
	'anthropic',
	'google',
	'meta',
	'mistral',
	'cohere',
	'xai',
	'amazon',
	'deepseek',
	'qwen',
	'inception',
	'zhipu-ai',
	'perplexity',
	'ai21-labs',
];

// ---------------------------------------------------------------------------
// Provider catalogue
// ---------------------------------------------------------------------------

export const PROVIDER_CATALOGUE: readonly ProviderDescriptor[] = [
	{ id: 'openai', name: 'OpenAI' },
	{ id: 'anthropic', name: 'Anthropic' },
	{ id: 'google', name: 'Google' },
	{ id: 'meta', name: 'Meta' },
	{ id: 'mistral', name: 'Mistral' },
	{ id: 'cohere', name: 'Cohere' },
	{ id: 'xai', name: 'xAI' },
	{ id: 'amazon', name: 'Amazon' },
	{ id: 'deepseek', name: 'DeepSeek' },
	{ id: 'qwen', name: 'Qwen' },
	{ id: 'inception', name: 'Inception' },
	{ id: 'zhipu-ai', name: 'Zhipu AI' },
	{ id: 'perplexity', name: 'Perplexity' },
	{ id: 'ai21-labs', name: 'AI21 Labs' },
];

// ---------------------------------------------------------------------------
// Derived lookup map (built once at module load)
// ---------------------------------------------------------------------------

const PROVIDER_MAP: Readonly<Record<string, ProviderDescriptor>> = Object.fromEntries(
	PROVIDER_CATALOGUE.map((p) => [p.id, p])
);

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/** Look up a provider by ID. */
export function getProvider(providerId: string): ProviderDescriptor | undefined {
	return PROVIDER_MAP[providerId];
}

/** Get all providers for UI display. */
export function getProvidersForDisplay(): readonly ProviderDescriptor[] {
	return PROVIDER_CATALOGUE;
}

/** Returns `true` if the provider ID is in the catalogue. */
export function isKnownProvider(providerId: string): providerId is ProviderId {
	return providerId in PROVIDER_MAP;
}

// ---------------------------------------------------------------------------
// Service Provider helpers
// ---------------------------------------------------------------------------

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
	provider: Pick<ServiceProvider, 'name' | 'apikey' | 'baseurl'>,
	index: number
): string {
	return `model-${slugify(provider.name)}-${index}-${hashModelIdentity(
		[provider.name, provider.baseurl, provider.apikey].join('\u0000')
	)}`;
}

export function toProviderConfig(
	provider: ServiceProvider,
	index: number
): ServiceProvider & { id: string } {
	const normalizedName = provider.name.trim();
	return {
		id: createProviderId(
			{ name: normalizedName, apikey: provider.apikey, baseurl: provider.baseurl },
			index
		),
		name: normalizedName,
		apikey: provider.apikey,
		baseurl: provider.baseurl,
	};
}
