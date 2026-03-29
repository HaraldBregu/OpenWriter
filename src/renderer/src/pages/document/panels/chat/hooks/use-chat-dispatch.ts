import { useContext, type Dispatch } from 'react';
import { ChatDispatchContext } from '../context/contexts';
import type { ChatAction } from '../context/actions';

export function useChatDispatch(): Dispatch<ChatAction> {
	const ctx = useContext(ChatDispatchContext);
	if (ctx === null) {
		throw new Error('useChatDispatch must be used within ChatProvider');
	}
	return ctx;
}
