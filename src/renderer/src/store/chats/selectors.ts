/** Chats state selectors. */
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { ChatItem } from './types';

const selectChatsSlice = (state: RootState) => state.chats;

/** All chat items as an array. */
export const selectAllChats = (state: RootState): ChatItem[] => state.chats.items;

/** The currently selected chat item, or undefined if none. */
export const selectSelectedChat = createSelector(selectChatsSlice, (chats) =>
	chats.items.find((c) => c.id === chats.selectedId)
);

/** The id of the currently selected chat. */
export const selectSelectedChatId = (state: RootState): string | null => state.chats.selectedId;

/** Chats loading status. */
export const selectChatsStatus = (state: RootState) => state.chats.status;

/** Chats error message. */
export const selectChatsError = (state: RootState) => state.chats.error;

/** A single chat item by id, or undefined. */
export const selectChatById = (state: RootState, id: string): ChatItem | undefined =>
	state.chats.items.find((c) => c.id === id);
