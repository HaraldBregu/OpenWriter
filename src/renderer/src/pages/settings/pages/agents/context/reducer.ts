import type { AgentsState } from './state';
import type { AgentsAction } from './actions';

function withSet<T>(set: ReadonlySet<T>, value: T, on: boolean): ReadonlySet<T> {
	const next = new Set(set);
	if (on) next.add(value);
	else next.delete(value);
	return next;
}

export function agentsReducer(state: AgentsState, action: AgentsAction): AgentsState {
	switch (action.type) {
		case 'SET_AGENTS':
			return { ...state, agentsById: action.payload };
		case 'PATCH_AGENT':
			return {
				...state,
				agentsById: { ...state.agentsById, [action.payload.id]: action.payload },
			};
		case 'SET_LOAD_STATUS':
			return { ...state, loadStatus: action.payload };
		case 'SET_SAVING':
			return { ...state, saving: withSet(state.saving, action.agentId, action.payload) };
		case 'SET_SAVED':
			return { ...state, saved: withSet(state.saved, action.agentId, action.payload) };
		case 'SET_MODELS':
			return {
				...state,
				modelsCache: { ...state.modelsCache, [action.providerId]: action.payload },
			};
		case 'SET_LOADING_PROVIDER':
			return {
				...state,
				loadingByProvider: { ...state.loadingByProvider, [action.providerId]: action.payload },
			};
		case 'SET_PROVIDER_ERROR':
			return {
				...state,
				errorByProvider: { ...state.errorByProvider, [action.providerId]: action.payload },
			};
	}
}
