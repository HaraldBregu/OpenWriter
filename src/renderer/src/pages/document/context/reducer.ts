import type { DocumentState } from './state';
import type { DocumentAction } from './actions';
import { chatReducer } from '../panels/chat/context';

export function documentReducer(state: DocumentState, action: DocumentAction): DocumentState {
	switch (action.type) {
		case 'LOAD_STARTED':
			return { ...state, loaded: false, title: '', content: '', metadata: null, images: [] };

		case 'LOAD_SUCCEEDED':
			return {
				...state,
				loaded: true,
				title: action.title,
				content: action.content,
				metadata: action.metadata,
			};

		case 'LOAD_FAILED':
			return { ...state, loaded: true };

		case 'TITLE_CHANGED':
			return { ...state, title: action.value };

		case 'CONTENT_CHANGED':
			return { ...state, content: action.value };

		case 'METADATA_UPDATED':
			return { ...state, metadata: action.metadata };

		case 'IMAGES_UPDATED':
			return { ...state, images: action.images };

		case 'TRASH_STARTED':
			return { ...state, isTrashing: true };

		case 'TRASH_FAILED':
			return { ...state, isTrashing: false };

		case 'SIDEBAR_TOGGLED': {
			const nextSidebar = !state.sidebarOpen;
			return {
				...state,
				sidebarOpen: nextSidebar,
				agenticSidebarOpen: nextSidebar ? false : state.agenticSidebarOpen,
			};
		}

		case 'AGENTIC_SIDEBAR_TOGGLED': {
			const nextAgentic = !state.agenticSidebarOpen;
			return {
				...state,
				agenticSidebarOpen: nextAgentic,
				sidebarOpen: nextAgentic ? false : state.sidebarOpen,
			};
		}

		case 'CHAT_SESSIONS_LOADED':
			return { ...state, chatSessions: action.sessions };

		case 'CHAT_MESSAGE_ADDED':
		case 'CHAT_MESSAGE_INSERTED_BEFORE':
		case 'CHAT_MESSAGE_UPDATED':
		case 'CHAT_ACTIVE_TASK_SET':
		case 'CHAT_ACTIVE_MESSAGE_SET':
		case 'CHAT_MESSAGES_LOADED':
		case 'CHAT_RESET':
		case 'CHAT_SESSION_STARTED':
			return { ...state, chat: chatReducer(state.chat, action) };

		default: {
			const _exhaustive: never = action;
			return _exhaustive;
		}
	}
}
