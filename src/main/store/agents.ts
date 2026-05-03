import type { AgentModel, AgentSettings } from '../../shared/types';
import { isRecord, trimmedString } from './utils';

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
