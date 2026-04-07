/** Documents slice — Redux Toolkit slice for document items state. */
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { initialState } from './state';
import type { DocumentItem, DocumentsState } from './types';

export type { DocumentsState };

export const documentsSlice = createSlice({
	name: 'documents',
	initialState,
	reducers: {
		/** Replace the full list of document items (e.g. after loading from disk). */
		documentsLoaded(state, action: PayloadAction<DocumentItem[]>) {
			state.items = action.payload;
			state.status = 'ready';
			state.error = null;
		},

		/** Add a new document item to the list. */
		documentAdded(state, action: PayloadAction<DocumentItem>) {
			state.items.push(action.payload);
		},

		/** Update an existing document item by id. */
		documentUpdated(state, action: PayloadAction<DocumentItem>) {
			const index = state.items.findIndex((d) => d.id === action.payload.id);
			if (index !== -1) {
				state.items[index] = action.payload;
			}
		},

		/** Patch only title, emoji, and updatedAt for an existing document. */
		documentMetadataPatched(
			state,
			action: PayloadAction<{ id: string; title: string; emoji?: string; updatedAt: number }>
		) {
			const item = state.items.find((d) => d.id === action.payload.id);
			if (item) {
				item.title = action.payload.title;
				item.emoji = action.payload.emoji;
				item.updatedAt = action.payload.updatedAt;
			}
		},

		/** Remove a document item by id. */
		documentRemoved(state, action: PayloadAction<string>) {
			state.items = state.items.filter((d) => d.id !== action.payload);
			if (state.selectedId === action.payload) {
				state.selectedId = null;
			}
		},

		/** Set the currently selected document item. */
		documentSelected(state, action: PayloadAction<string | null>) {
			state.selectedId = action.payload;
		},

		/** Set loading status and clear any previous error. */
		documentsLoadingStarted(state) {
			state.status = 'loading';
			state.error = null;
		},

		/** Set error status with a message. */
		documentsLoadingFailed(state, action: PayloadAction<string>) {
			state.status = 'error';
			state.error = action.payload;
		},
	},
});

export const {
	documentsLoaded,
	documentAdded,
	documentUpdated,
	documentMetadataPatched,
	documentRemoved,
	documentSelected,
	documentsLoadingStarted,
	documentsLoadingFailed,
} = documentsSlice.actions;

export default documentsSlice.reducer;
