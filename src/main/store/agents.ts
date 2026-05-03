import type { AgentModel, AgentSettings } from '../../shared/types';
import { isRecord } from './utils';

export function cloneAgent(agent: AgentSettings): AgentSettings {
	return {
		id: agent.id,
		name: agent.name,
		models: agent.models.map((m) => ({ ...m })),
	};
}

export function normalizeAgentModel(value: unknown): AgentModel | null {
	if (!isRecord(value)) return null;
	const id = typeof value.id === 'string' ? value.id.trim() : '';
	const providerId = typeof value.providerId === 'string' ? value.providerId.trim() : '';
	const modelId = typeof value.modelId === 'string' ? value.modelId.trim() : '';
	if (!id || !providerId || !modelId) return null;
	return { id, providerId, modelId };
}

export function normalizeAgentInput(value: unknown): AgentSettings | null {
	if (!isRecord(value)) {
		return null;
	}

	const id = typeof value.id === 'string' ? value.id.trim() : '';
	const name = typeof value.name === 'string' ? value.name.trim() : '';
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
