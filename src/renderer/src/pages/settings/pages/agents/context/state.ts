import type { AgentSettings, ProviderModelInfo } from '../../../../../../../shared/types';
import { AGENT_DEFINITIONS } from '../../../../../../../shared/agents';
import type { AgentDefinition } from '../../../../../../../shared/agents';

export type LoadStatus =
	| { type: 'idle' }
	| { type: 'loading' }
	| { type: 'error'; message: string };

function defaultAgentSettings(def: AgentDefinition): AgentSettings {
	return {
		id: def.id,
		name: def.name,
		models: [],
	};
}

export function buildDefaultAgentsById(): Record<string, AgentSettings> {
	return Object.fromEntries(
		AGENT_DEFINITIONS.map((def) => [def.id, defaultAgentSettings(def)])
	);
}

export interface AgentsState {
	agentsById: Record<string, AgentSettings>;
	modelsCache: Record<string, ProviderModelInfo[]>;
	loadingByProvider: Record<string, boolean>;
	errorByProvider: Record<string, string | null>;
	saving: ReadonlySet<string>;
	saved: ReadonlySet<string>;
	loadStatus: LoadStatus;
}

export const initialState: AgentsState = {
	agentsById: buildDefaultAgentsById(),
	modelsCache: {},
	loadingByProvider: {},
	errorByProvider: {},
	saving: new Set(),
	saved: new Set(),
	loadStatus: { type: 'loading' },
};
