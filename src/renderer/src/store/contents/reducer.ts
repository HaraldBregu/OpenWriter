/** Contents slice reducer — handles sync actions and async thunk lifecycle cases. */
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { initialContentsState } from './state';
import type { ContentsState } from './state';
import { loadContents, removeContents } from './actions';

export type { ContentsState };

export const contentsSlice = createSlice({
	name: 'contents',
	initialState: initialContentsState,
	reducers: {
		/**
		 * Remove a single content entry from the store (e.g., watcher fires a 'removed' event).
		 */
		contentEntryRemoved: (state, action: PayloadAction<string>) => {
			state.entries = state.entries.filter((f) => f.id !== action.payload);
		},

		/**
		 * Triggered to start a content insert (import) operation.
		 * The listener middleware picks this up and calls the IPC method.
		 */
		insertContentsRequested: (state, _action: PayloadAction<string[]>) => {
			state.inserting = true;
		},

		/**
		 * Called when the insert operation completes (success or failure).
		 */
		insertContentsCompleted: (state) => {
			state.inserting = false;
		},

		/**
		 * Reset the contents state (e.g., when workspace is cleared).
		 */
		resetContents: (state) => {
			state.entries = [];
			state.status = 'idle';
			state.error = null;
			state.inserting = false;
		},
	},
	extraReducers: (builder) => {
		// loadContents
		builder
			.addCase(loadContents.pending, (state) => {
				state.status = 'loading';
				state.error = null;
			})
			.addCase(loadContents.fulfilled, (state, action) => {
				state.entries = action.payload;
				state.status = 'ready';
			})
			.addCase(loadContents.rejected, (state, action) => {
				state.status = 'error';
				state.error = action.error.message ?? 'Failed to load contents';
			});

		// removeContents
		builder
			.addCase(removeContents.pending, (state) => {
				state.status = 'loading';
				state.error = null;
			})
			.addCase(removeContents.fulfilled, (state, action) => {
				state.entries = action.payload;
				state.status = 'ready';
			})
			.addCase(removeContents.rejected, (state, action) => {
				state.status = 'error';
				state.error = action.error.message ?? 'Failed to remove contents';
			});
	},
});

export const { contentEntryRemoved, insertContentsRequested, insertContentsCompleted, resetContents } =
	contentsSlice.actions;

export default contentsSlice.reducer;
