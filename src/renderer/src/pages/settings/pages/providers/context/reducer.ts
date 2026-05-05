import type { ProviderId } from '../../../../../../../shared/types';
import type { ProvidersState } from './state';
import type { ProvidersAction } from './actions';

function withSet<T>(set: ReadonlySet<T>, value: T, on: boolean): ReadonlySet<T> {
	const next = new Set(set);
	if (on) next.add(value);
	else next.delete(value);
	return next;
}

export function providersReducer(state: ProvidersState, action: ProvidersAction): ProvidersState {
	switch (action.type) {
		case 'SET_PROVIDERS':
			return { ...state, providers: action.payload };
		case 'SET_DRAFTS':
			return { ...state, drafts: action.payload };
		case 'PATCH_DRAFT':
			return {
				...state,
				drafts: {
					...state.drafts,
					[action.providerId]: { ...state.drafts[action.providerId], ...action.payload },
				},
			};
		case 'SET_SAVING':
			return {
				...state,
				saving: withSet<ProviderId>(state.saving, action.providerId, action.payload),
			};
	}
}
