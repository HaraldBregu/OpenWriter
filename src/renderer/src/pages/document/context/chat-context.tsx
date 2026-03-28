import React, {
	createContext,
	useReducer,
	useContext,
	useMemo,
	type Dispatch,
	type ReactNode,
} from 'react';
import type { DocumentChatMessage } from './state';

export interface ChatSession {
	sessionId: string | null;
	messages: DocumentChatMessage[];
	activeTaskId: string | null;
	activeMessageId: string | null;
}

export type ChatAction =
	| { type: 'CHAT_MESSAGE_ADDED'; message: DocumentChatMessage }
	| {
			type: 'CHAT_MESSAGE_UPDATED';
			id: string;
			patch: Partial<Omit<DocumentChatMessage, 'id' | 'role' | 'timestamp'>>;
	  }
	| { type: 'CHAT_ACTIVE_TASK_SET'; taskId: string | null }
	| { type: 'CHAT_ACTIVE_MESSAGE_SET'; messageId: string | null }
	| { type: 'CHAT_MESSAGES_LOADED'; messages: DocumentChatMessage[]; sessionId: string | null }
	| { type: 'CHAT_RESET'; sessionId?: string }
	| { type: 'CHAT_SESSION_STARTED'; sessionId: string };

const INITIAL_CHAT_STATE: ChatSession = {
	sessionId: null,
	messages: [],
	activeTaskId: null,
	activeMessageId: null,
};

function chatReducer(state: ChatSession, action: ChatAction): ChatSession {
	switch (action.type) {
		case 'CHAT_MESSAGE_ADDED':
			return { ...state, messages: [...state.messages, action.message] };
		case 'CHAT_MESSAGE_UPDATED': {
			const index = state.messages.findIndex((m) => m.id === action.id);
			if (index === -1) return state;
			const updated = [...state.messages];
			updated[index] = { ...updated[index], ...action.patch };
			return { ...state, messages: updated };
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

export const ChatStateContext = createContext<ChatSession | null>(null);
export const ChatDispatchContext = createContext<Dispatch<ChatAction> | null>(null);

interface ChatProviderProps {
	readonly children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps): React.JSX.Element {
	const [state, dispatch] = useReducer(chatReducer, INITIAL_CHAT_STATE);
	const stableState = useMemo(() => state, [state]);

	return (
		<ChatStateContext.Provider value={stableState}>
			<ChatDispatchContext.Provider value={dispatch}>{children}</ChatDispatchContext.Provider>
		</ChatStateContext.Provider>
	);
}

export function useChatState(): ChatSession {
	const ctx = useContext(ChatStateContext);
	if (!ctx) throw new Error('useChatState must be used within ChatProvider');
	return ctx;
}

export function useChatDispatch(): Dispatch<ChatAction> {
	const ctx = useContext(ChatDispatchContext);
	if (!ctx) throw new Error('useChatDispatch must be used within ChatProvider');
	return ctx;
}
