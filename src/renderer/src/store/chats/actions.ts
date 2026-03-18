/** Chats slice synchronous actions — re-exported from the reducer for convenient named imports. */
export {
	chatsLoaded,
	chatAdded,
	chatUpdated,
	chatRemoved,
	chatSelected,
	chatsLoadingStarted,
	chatsLoadingFailed,
} from './reducer';

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch } from '../index';
import type { ChatItem } from './types';
import { chatsLoadingStarted, chatsLoaded, chatsLoadingFailed, chatUpdated } from './reducer';

function toChatItem(f: {
	id: string;
	path: string;
	metadata: { title?: string };
	savedAt: number;
}): ChatItem {
	return {
		id: f.id,
		title: (f.metadata.title as string) || '',
		path: f.path,
		createdAt: f.savedAt,
		updatedAt: f.savedAt,
	};
}

export const loadChats = createAsyncThunk<void, void, { dispatch: AppDispatch }>(
	'chats/load',
	async (_, { dispatch }) => {
		dispatch(chatsLoadingStarted());
		try {
			const files = await window.workspace.loadOutputsByType('chats');
			dispatch(chatsLoaded(files.map(toChatItem)));
		} catch (err) {
			dispatch(chatsLoadingFailed(err instanceof Error ? err.message : String(err)));
		}
	}
);

export const refreshChat = createAsyncThunk<void, string, { dispatch: AppDispatch }>(
	'chats/refresh',
	async (id, { dispatch }) => {
		try {
			const file = await window.workspace.loadOutput({ type: 'chats', id });
			if (file) dispatch(chatUpdated(toChatItem(file)));
		} catch {
			// silently ignore — stale state is acceptable for a single refresh
		}
	}
);
