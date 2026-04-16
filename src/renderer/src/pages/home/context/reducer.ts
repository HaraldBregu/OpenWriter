import type { HomeState } from './state';
import type { HomeAction } from './actions';

export function homeReducer(state: HomeState, action: HomeAction): HomeState {
	switch (action.type) {
		case 'SET_GREETING':
			return { ...state, greeting: action.value };

		default: {
			const _exhaustive: never = action;
			return _exhaustive;
		}
	}
}
