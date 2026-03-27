import type { DocumentState } from './state';
import type { DocumentAction } from './actions';

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

		case 'CHAT_RESET':
			return {
				...state,
				chatMessages: [],
				activeChatTaskId: null,
				activeChatMessageId: null,
			};

		case 'CHAT_MESSAGE_ADDED':
			return {
				...state,
				chatMessages: [...state.chatMessages, action.message],
			};

		case 'CHAT_MESSAGE_UPDATED':
			return {
				...state,
				chatMessages: state.chatMessages.map((message) =>
					message.id === action.id ? { ...message, ...action.patch } : message
				),
			};

		case 'CHAT_ACTIVE_MESSAGE_SET':
			return {
				...state,
				activeChatMessageId: action.messageId,
			};

		case 'CHAT_ACTIVE_TASK_SET':
			return {
				...state,
				activeChatTaskId: action.taskId,
			};

		case 'CHAT_MESSAGES_LOADED':
			return {
				...state,
				chatMessages: action.messages,
				activeChatTaskId: null,
				activeChatMessageId: null,
			};

		default: {
			const _exhaustive: never = action;
			return _exhaustive;
		}
	}
}
