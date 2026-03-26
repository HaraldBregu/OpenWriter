// ---------------------------------------------------------------------------
// Shared provider types
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

export interface ServiceProvider {
	name: string;
	apikey: string;
	baseurl: string;
}

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
