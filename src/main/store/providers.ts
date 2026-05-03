import { getProvider } from '../../shared/providers';
import type { Provider } from '../../shared/types';
import { isRecord } from './utils';

/**
 * Parse a Provider entry from arbitrary input. Accepts both the new flat shape
 * `{ id, name, apiKey }` and the legacy `{ provider: { id, name }, apiKey }`
 * shape so existing settings files migrate cleanly.
 */
export function normalizeProviderInput(value: unknown): Provider | null {
	if (!isRecord(value)) return null;

	let id: string | undefined;
	let name: string | undefined;

	if (typeof value.id === 'string' && value.id.trim().length > 0) {
		id = value.id.trim();
		if (typeof value.name === 'string' && value.name.trim().length > 0) {
			name = value.name.trim();
		}
	} else if (isRecord(value.provider) && typeof value.provider.id === 'string') {
		id = value.provider.id.trim();
		if (typeof value.provider.name === 'string' && value.provider.name.trim().length > 0) {
			name = value.provider.name.trim();
		}
	}

	if (!id) return null;

	const known = getProvider(id);
	const resolvedName = name ?? known?.name ?? id;

	const apiKey =
		typeof value.apiKey === 'string'
			? value.apiKey
			: typeof value.apikey === 'string'
				? value.apikey
				: '';

	return { id, name: resolvedName, apiKey };
}

export function normalizeProviders(value: unknown): Provider[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	const out: Provider[] = [];
	for (const entry of value) {
		const provider = normalizeProviderInput(entry);
		if (!provider || seen.has(provider.id)) continue;
		seen.add(provider.id);
		out.push(provider);
	}
	return out;
}

export function cloneProvider(provider: Provider): Provider {
	return { id: provider.id, name: provider.name, apiKey: provider.apiKey };
}
