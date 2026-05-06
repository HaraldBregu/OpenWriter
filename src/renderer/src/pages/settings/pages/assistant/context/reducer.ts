import type { AssistantState } from './state';
import type { AssistantAction } from './actions';

export function assistantReducer(state: AssistantState, action: AssistantAction): AssistantState {
	switch (action.type) {
		case 'INPUT_CHANGED':
			return { ...state, input: action.value };

		case 'MESSAGE_APPENDED':
			return { ...state, messages: [...state.messages, action.message] };

		case 'RUN_STARTED':
			return { ...state, isRunning: true };

		case 'RUN_FINISHED':
			return { ...state, isRunning: false };

		case 'CLEARED':
			return { ...state, messages: [], input: '' };

		default: {
			const _exhaustive: never = action;
			return _exhaustive;
		}
	}
}
