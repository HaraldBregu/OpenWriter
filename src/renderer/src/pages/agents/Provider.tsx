import { createContext, useCallback, useContext, useReducer } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type {
	AgentSettings,
	ProviderId,
	ProviderModelInfo,
} from '../../../../shared/types';
import { AGENT_DEFINITIONS } from '../../../../shared/agents';
import type { AgentDefinition } from '../../../../shared/agents';
import { agentsReducer } from './context/reducer';
import { initialState, type LoadStatus } from './context/state';

export interface AgentsContextValue {
	agentsById: Record<string, AgentSettings>;
	modelsCache: Record<string, ProviderModelInfo[]>;
	loadingByProvider: Record<string, boolean>;
	errorByProvider: Record<string, string | null>;
	saving: ReadonlySet<string>;
	saved: ReadonlySet<string>;
	loadStatus: LoadStatus;
	setAgents: (agents: Record<string, AgentSettings>) => void;
	setLoadStatus: (status: LoadStatus) => void;
	ensureModelsLoaded: (providerId: string) => Promise<ProviderModelInfo[]>;
	handleProviderChange: (def: AgentDefinition, providerId: ProviderId) => Promise<void>;
	handleModelChange: (def: AgentDefinition, modelId: string) => Promise<void>;
}

const AgentsContext = createContext<AgentsContextValue | null>(null);

export function useAgentsContext(): AgentsContextValue {
	const context = useContext(AgentsContext);
	if (!context) {
		throw new Error('useAgentsContext must be used within an AgentsProvider');
	}
	return context;
}

function defaultAgentSettings(def: AgentDefinition): AgentSettings {
	return { id: def.id, name: def.name, models: [] };
}

interface AgentsProviderProps {
	readonly children: ReactNode;
}

export function AgentsProvider({ children }: AgentsProviderProps): ReactElement {
	const [state, dispatch] = useReducer(agentsReducer, initialState);

	const setAgents = useCallback((agents: Record<string, AgentSettings>) => {
		dispatch({ type: 'SET_AGENTS', payload: agents });
	}, []);

	const setLoadStatus = useCallback((status: LoadStatus) => {
		dispatch({ type: 'SET_LOAD_STATUS', payload: status });
	}, []);

	const ensureModelsLoaded = useCallback(
		async (providerId: string): Promise<ProviderModelInfo[]> => {
			const cached = state.modelsCache[providerId];
			if (cached) return cached;

			dispatch({ type: 'SET_LOADING_PROVIDER', providerId, payload: true });
			dispatch({ type: 'SET_PROVIDER_ERROR', providerId, payload: null });
			try {
				const fetched = await window.app.getModels(providerId);
				dispatch({ type: 'SET_MODELS', providerId, payload: fetched });
				return fetched;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Unable to load models.';
				dispatch({ type: 'SET_PROVIDER_ERROR', providerId, payload: message });
				return [];
			} finally {
				dispatch({ type: 'SET_LOADING_PROVIDER', providerId, payload: false });
			}
		},
		[state.modelsCache]
	);

	const persistAgent = useCallback(async (next: AgentSettings) => {
		dispatch({ type: 'PATCH_AGENT', payload: next });
		dispatch({ type: 'SET_SAVING', agentId: next.id, payload: true });
		dispatch({ type: 'SET_SAVED', agentId: next.id, payload: false });
		try {
			const saved = await window.app.updateAgent(next);
			dispatch({ type: 'PATCH_AGENT', payload: saved });
			dispatch({ type: 'SET_SAVED', agentId: next.id, payload: true });
		} catch (error) {
			dispatch({
				type: 'SET_LOAD_STATUS',
				payload: {
					type: 'error',
					message: error instanceof Error ? error.message : 'Unable to save agent settings.',
				},
			});
		} finally {
			dispatch({ type: 'SET_SAVING', agentId: next.id, payload: false });
		}
	}, []);

	const handleProviderChange = useCallback(
		async (def: AgentDefinition, providerId: ProviderId) => {
			const current = state.agentsById[def.id] ?? defaultAgentSettings(def);
			const existingId = current.models[0]?.id ?? crypto.randomUUID();
			const cleared: AgentSettings = {
				...current,
				models: [{ id: existingId, providerId, modelId: '' }],
			};
			await persistAgent(cleared);

			const fetched = await ensureModelsLoaded(providerId);
			const candidate = fetched[0];
			if (!candidate) return;

			void persistAgent({
				...cleared,
				models: [{ id: existingId, providerId, modelId: candidate.id }],
			});
		},
		[state.agentsById, persistAgent, ensureModelsLoaded]
	);

	const handleModelChange = useCallback(
		async (def: AgentDefinition, modelId: string) => {
			const current = state.agentsById[def.id] ?? defaultAgentSettings(def);
			const existing = current.models[0];
			if (!existing) return;
			await persistAgent({
				...current,
				models: [{ ...existing, modelId }],
			});
		},
		[state.agentsById, persistAgent]
	);

	const value: AgentsContextValue = {
		agentsById: state.agentsById,
		modelsCache: state.modelsCache,
		loadingByProvider: state.loadingByProvider,
		errorByProvider: state.errorByProvider,
		saving: state.saving,
		saved: state.saved,
		loadStatus: state.loadStatus,
		setAgents,
		setLoadStatus,
		ensureModelsLoaded,
		handleProviderChange,
		handleModelChange,
	};

	return <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>;
}

export { AGENT_DEFINITIONS };
export type { AgentDefinition };
