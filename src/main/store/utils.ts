import { getProvider } from '../../shared/providers';
import type { AgentModel, AgentSettings, Provider } from '../../shared/types';

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function trimmedString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

export function nonEmptyTrimmed(value: unknown): string | undefined {
	const trimmed = trimmedString(value);
	return trimmed.length > 0 ? trimmed : undefined;
}

export function stringOrEmpty(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

export function cloneAgent(agent: AgentSettings): AgentSettings {
	return {
		id: agent.id,
		name: agent.name,
		models: agent.models.map((m) => ({ ...m })),
	};
}

export function normalizeAgentModel(value: unknown): AgentModel | null {
	if (!isRecord(value)) return null;
	const id = trimmedString(value.id);
	const providerId = trimmedString(value.providerId);
	const modelId = trimmedString(value.modelId);
	if (!id || !providerId || !modelId) return null;
	return { id, providerId, modelId };
}

export function normalizeAgentInput(value: unknown): AgentSettings | null {
	if (!isRecord(value)) {
		return null;
	}

	const id = trimmedString(value.id);
	const name = trimmedString(value.name);
	if (!id || !name) {
		return null;
	}

	const models = Array.isArray(value.models)
		? value.models.map(normalizeAgentModel).filter((m): m is AgentModel => m !== null)
		: [];

	return { id, name, models };
}

export function normalizeAgents(value: unknown): AgentSettings[] {
	if (!Array.isArray(value)) return [];
	return value
		.map(normalizeAgentInput)
		.filter((agent): agent is AgentSettings => agent !== null);
}

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
