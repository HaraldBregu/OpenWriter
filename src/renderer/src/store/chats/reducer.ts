/** Chats slice — Redux Toolkit slice for chat items state. */
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { initialState } from './state';
import type { ChatItem, ChatsState } from './types';

export type { ChatsState };

export const chatsSlice = createSlice({
	name: 'chats',
	initialState,
	reducers: {
		/** Replace the full list of chat items (e.g. after loading from disk). */
		chatsLoaded(state, action: PayloadAction<ChatItem[]>) {
			state.items = action.payload;
			state.status = 'ready';
			state.error = null;
		},

		/** Add a new chat item to the list. */
		chatAdded(state, action: PayloadAction<ChatItem>) {
			state.items.push(action.payload);
		},

		/** Update an existing chat item by id. */
		chatUpdated(state, action: PayloadAction<ChatItem>) {
			const index = state.items.findIndex((c) => c.id === action.payload.id);
			if (index !== -1) {
				state.items[index] = action.payload;
			}
		},

		/** Remove a chat item by id. */
		chatRemoved(state, action: PayloadAction<string>) {
			state.items = state.items.filter((c) => c.id !== action.payload);
			if (state.selectedId === action.payload) {
				state.selectedId = null;
			}
		},

		/** Set the currently selected chat item. */
		chatSelected(state, action: PayloadAction<string | null>) {
			state.selectedId = action.payload;
		},

		/** Set loading status and clear any previous error. */
		chatsLoadingStarted(state) {
			state.status = 'loading';
			state.error = null;
		},

		/** Set error status with a message. */
		chatsLoadingFailed(state, action: PayloadAction<string>) {
			state.status = 'error';
			state.error = action.payload;
		},
	},
});

export const {
	chatsLoaded,
	chatAdded,
	chatUpdated,
	chatRemoved,
	chatSelected,
	chatsLoadingStarted,
	chatsLoadingFailed,
} = chatsSlice.actions;

export default chatsSlice.reducer;
