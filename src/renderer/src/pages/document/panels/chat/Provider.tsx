import React, { type Dispatch, type ReactNode } from 'react';
import { useDocumentDispatch, useDocumentState } from '../../hooks';
import { ChatDispatchContext, ChatStateContext } from './context/contexts';
import type { ChatAction } from './context/actions';

interface ChatProviderProps {
	readonly children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps): React.JSX.Element {
	const documentState = useDocumentState();
	const documentDispatch = useDocumentDispatch();

	return (
		<ChatStateContext.Provider value={documentState.chat}>
			<ChatDispatchContext.Provider value={documentDispatch as Dispatch<ChatAction>}>
				{children}
			</ChatDispatchContext.Provider>
		</ChatStateContext.Provider>
	);
}
