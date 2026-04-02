import { useContext } from 'react';
import { ChatStateContext } from '../context/contexts';
import type { ChatSession } from '../shared';

export function useChatState(): ChatSession {
	const ctx = useContext(ChatStateContext);
	if (ctx === null) {
		throw new Error('useChatState must be used within ChatProvider');
	}
	return ctx;
}
