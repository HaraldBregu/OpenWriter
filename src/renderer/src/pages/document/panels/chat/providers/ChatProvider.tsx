import React, { createContext, useContext, type Dispatch, type ReactNode } from 'react';
import { DocumentDispatchContext, DocumentStateContext } from '../../../providers';
import type { ChatAction } from '../context/actions';
import type { ChatSession } from '../context/state';

export const ChatStateContext = createContext<ChatSession | null>(null);
export const ChatDispatchContext = createContext<Dispatch<ChatAction> | null>(null);

interface ChatProviderProps {
	readonly children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps): React.JSX.Element {
	const documentState = useContext(DocumentStateContext);
	const documentDispatch = useContext(DocumentDispatchContext);

	if (documentState === null || documentDispatch === null) {
		throw new Error('ChatProvider must be used within a DocumentProvider');
	}

	return (
		<ChatStateContext.Provider value={documentState.chat}>
			<ChatDispatchContext.Provider value={documentDispatch as Dispatch<ChatAction>}>
				{children}
			</ChatDispatchContext.Provider>
		</ChatStateContext.Provider>
	);
}

export function useChatState(): ChatSession {
	const ctx = useContext(ChatStateContext);
	if (ctx === null) {
		throw new Error('useChatState must be used within ChatProvider');
	}
	return ctx;
}

export function useChatDispatch(): Dispatch<ChatAction> {
	const ctx = useContext(ChatDispatchContext);
	if (ctx === null) {
		throw new Error('useChatDispatch must be used within ChatProvider');
	}
	return ctx;
}
