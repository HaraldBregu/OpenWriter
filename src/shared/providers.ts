// ---------------------------------------------------------------------------
// Shared AI Provider Constants — Provider Catalogue & Service Providers
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts (main, renderer, preload).
// ---------------------------------------------------------------------------

import type { Provider, ProviderId, Service } from './types';

// ---------------------------------------------------------------------------
// Provider constants
// ---------------------------------------------------------------------------

export const OPENAI: Provider = { id: 'openai', name: 'OpenAI' };
export const ANTHROPIC: Provider = { id: 'anthropic', name: 'Anthropic' };
export const GOOGLE: Provider = { id: 'google', name: 'Google' };
export const META: Provider = { id: 'meta', name: 'Meta' };
export const MISTRAL: Provider = { id: 'mistral', name: 'Mistral' };
export const XAI: Provider = { id: 'xai', name: 'xAI' };
export const DEEPSEEK: Provider = { id: 'deepseek', name: 'DeepSeek' };
export const QWEN: Provider = { id: 'qwen', name: 'Qwen' };

// ---------------------------------------------------------------------------
// Provider catalogue
// ---------------------------------------------------------------------------

export const PROVIDER_CATALOGUE: readonly Provider[] = [
	OPENAI,
	ANTHROPIC,
	GOOGLE,
	META,
	MISTRAL,
	XAI,
	DEEPSEEK,
	QWEN,
];

export const PROVIDER_IDS: readonly ProviderId[] = PROVIDER_CATALOGUE.map(
	(p) => p.id as ProviderId
);

// ---------------------------------------------------------------------------
// Derived lookup map (built once at module load)
// ---------------------------------------------------------------------------

const PROVIDER_MAP: Readonly<Record<string, Provider>> = Object.fromEntries(
	PROVIDER_CATALOGUE.map((p) => [p.id, p])
);

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/** Look up a provider by ID. */
export function getProvider(providerId: string): Provider | undefined {
	return PROVIDER_MAP[providerId];
}

/** Get all providers for UI display. */
export function getProvidersForDisplay(): readonly Provider[] {
	return PROVIDER_CATALOGUE;
}

/** Returns `true` if the provider ID is in the catalogue. */
export function isKnownProvider(providerId: string): providerId is ProviderId {
	return providerId in PROVIDER_MAP;
}

// ---------------------------------------------------------------------------
// Service helpers
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

export function createServiceId(service: Service, index: number): string {
	return `model-${slugify(service.provider.id)}-${index}-${hashModelIdentity(
		[service.provider.id, service.apiKey].join('\u0000')
	)}`;
}

export function toServiceConfig(service: Service, index: number): Service & { id: string } {
	return {
		id: createServiceId(service, index),
		provider: service.provider,
		apiKey: service.apiKey,
	};
}
