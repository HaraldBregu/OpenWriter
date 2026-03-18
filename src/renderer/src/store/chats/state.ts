/** Chats slice initial state. */
import type { ChatsState } from './types';

export type { ChatsState };

export const initialState: ChatsState = {
	items: [],
	selectedId: null,
	status: 'idle',
	error: null,
};
