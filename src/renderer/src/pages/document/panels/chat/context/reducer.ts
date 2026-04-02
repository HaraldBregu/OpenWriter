import type { ChatAction } from './actions';
import type { ChatSession } from '../shared';

export function chatReducer(state: ChatSession, action: ChatAction): ChatSession {
	switch (action.type) {
		case 'CHAT_MESSAGE_ADDED':
			return { ...state, messages: [...state.messages, action.message] };
		case 'CHAT_MESSAGE_INSERTED_BEFORE': {
			const index = state.messages.findIndex((message) => message.id === action.beforeId);
			if (index === -1) {
				return { ...state, messages: [...state.messages, action.message] };
			}
			return {
				...state,
				messages: [
					...state.messages.slice(0, index),
					action.message,
					...state.messages.slice(index),
				],
			};
		}
		case 'CHAT_MESSAGE_UPDATED': {
			const index = state.messages.findIndex((message) => message.id === action.id);
			if (index === -1) return state;
			const messages = [...state.messages];
			messages[index] = { ...messages[index], ...action.patch };
			return { ...state, messages };
		}
		case 'CHAT_ACTIVE_TASK_SET':
			return { ...state, activeTaskId: action.taskId };
		case 'CHAT_ACTIVE_MESSAGE_SET':
			return { ...state, activeMessageId: action.messageId };
		case 'CHAT_MESSAGES_LOADED':
			return {
				sessionId: action.sessionId,
				messages: action.messages,
				activeTaskId: null,
				activeMessageId: null,
			};
		case 'CHAT_RESET':
			return {
				sessionId: action.sessionId ?? null,
				messages: [],
				activeTaskId: null,
				activeMessageId: null,
			};
		case 'CHAT_SESSION_STARTED':
			return { ...state, sessionId: action.sessionId };
		default: {
			const _exhaustive: never = action;
			return _exhaustive;
		}
	}
}
