import { getProvider } from '../../shared/providers';
import type { Provider } from '../../shared/types';
import { isRecord, nonEmptyTrimmed, stringOrEmpty, trimmedString } from './utils';

/**
 * Parse a Provider entry from arbitrary input. Accepts both the new flat shape
 * `{ id, name, apiKey }` and the legacy `{ provider: { id, name }, apiKey }`
 * shape so existing settings files migrate cleanly.
 */
export function normalizeProviderInput(value: unknown): Provider | null {
	if (!isRecord(value)) return null;

	let id: string | undefined;
	let name: string | undefined;

	const directId = nonEmptyTrimmed(value.id);
	if (directId) {
		id = directId;
		name = nonEmptyTrimmed(value.name);
	} else if (isRecord(value.provider)) {
		const providerId = trimmedString(value.provider.id);
		if (providerId) {
			id = providerId;
			name = nonEmptyTrimmed(value.provider.name);
		}
	}

	if (!id) return null;

	const known = getProvider(id);
	const resolvedName = name ?? known?.name ?? id;

	const apiKey = stringOrEmpty(value.apiKey) || stringOrEmpty(value.apikey);

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
