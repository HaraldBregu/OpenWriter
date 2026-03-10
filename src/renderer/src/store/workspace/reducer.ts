/** Workspace slice reducer — handles sync actions and async thunk lifecycle cases. */
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { initialState } from './state';
import type { WorkspaceState } from './state';
import {
	loadCurrentWorkspace,
	loadRecentWorkspaces,
	selectWorkspace,
	openWorkspacePicker,
	removeRecentWorkspace,
	clearWorkspace,
	loadDocuments,
	removeDocuments,
} from './actions';

export type { WorkspaceState };

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const workspaceSlice = createSlice({
	name: 'workspace',
	initialState,
	reducers: {
		/**
		 * Handle workspace change events from the main process.
		 * Called when window.workspace.onChange() fires.
		 */
		handleWorkspaceChanged: (
			state,
			action: PayloadAction<{ currentPath: string | null; previousPath: string | null }>
		) => {
			state.currentPath = action.payload.currentPath;
			state.status = 'ready';
			state.error = null;
			state.deletionReason = null;
		},

		/**
		 * Handle external removal of a recent workspace.
		 */
		handleRecentRemoved: (state, action: PayloadAction<string>) => {
			state.recentWorkspaces = state.recentWorkspaces.filter((ws) => ws.path !== action.payload);
		},

		/**
		 * Handle workspace folder deletion detected by the main process.
		 * Clears the workspace and records the reason so the UI can display
		 * an appropriate message to the user.
		 */
		handleWorkspaceDeleted: (
			state,
			action: PayloadAction<{ deletedPath: string; reason: string }>
		) => {
			state.currentPath = null;
			state.status = 'ready';
			state.error = null;
			state.deletionReason = action.payload.reason;
		},

		/**
		 * Clear the deletion reason (e.g., after the user has acknowledged the message).
		 */
		clearDeletionReason: (state) => {
			state.deletionReason = null;
		},
	},
	extraReducers: (builder) => {
		// loadCurrentWorkspace
		builder
			.addCase(loadCurrentWorkspace.pending, (state) => {
				state.status = 'loading';
				state.error = null;
			})
			.addCase(loadCurrentWorkspace.fulfilled, (state, action) => {
				state.currentPath = action.payload;
				state.status = 'ready';
			})
			.addCase(loadCurrentWorkspace.rejected, (state, action) => {
				state.status = 'error';
				state.error = action.error.message || 'Failed to load current workspace';
			});

		// loadRecentWorkspaces
		builder
			.addCase(loadRecentWorkspaces.fulfilled, (state, action) => {
				state.recentWorkspaces = action.payload;
			})
			.addCase(loadRecentWorkspaces.rejected, (_state, action) => {
				console.error('Failed to load recent workspaces:', action.error);
			});

		// selectWorkspace
		builder
			.addCase(selectWorkspace.pending, (state) => {
				state.status = 'loading';
				state.error = null;
			})
			.addCase(selectWorkspace.fulfilled, (state, action) => {
				state.currentPath = action.payload;
				state.status = 'ready';
			})
			.addCase(selectWorkspace.rejected, (state, action) => {
				state.status = 'error';
				state.error = action.error.message || 'Failed to select workspace';
			});

		// openWorkspacePicker
		builder
			.addCase(openWorkspacePicker.pending, (state) => {
				state.status = 'loading';
				state.error = null;
			})
			.addCase(openWorkspacePicker.fulfilled, (state, action) => {
				if (action.payload) {
					state.currentPath = action.payload;
				}
				state.status = 'ready';
			})
			.addCase(openWorkspacePicker.rejected, (state, action) => {
				state.status = 'error';
				state.error = action.error.message || 'Failed to open workspace picker';
			});

		// removeRecentWorkspace
		builder.addCase(removeRecentWorkspace.fulfilled, (state, action) => {
			state.recentWorkspaces = state.recentWorkspaces.filter((ws) => ws.path !== action.payload);
		});

		// clearWorkspace
		builder
			.addCase(clearWorkspace.fulfilled, (state) => {
				state.currentPath = null;
				state.status = 'ready';
				state.documents = [];
				state.documentsStatus = 'idle';
				state.documentsError = null;
			})
			.addCase(clearWorkspace.rejected, (state, action) => {
				state.status = 'error';
				state.error = action.error.message || 'Failed to clear workspace';
			});

		// loadDocuments
		builder
			.addCase(loadDocuments.pending, (state) => {
				state.documentsStatus = 'loading';
				state.documentsError = null;
			})
			.addCase(loadDocuments.fulfilled, (state, action) => {
				state.documents = action.payload;
				state.documentsStatus = 'ready';
			})
			.addCase(loadDocuments.rejected, (state, action) => {
				state.documentsStatus = 'error';
				state.documentsError = action.error.message || 'Failed to load resources';
			});

		// removeDocuments
		builder
			.addCase(removeDocuments.pending, (state) => {
				state.documentsStatus = 'loading';
				state.documentsError = null;
			})
			.addCase(removeDocuments.fulfilled, (state, action) => {
				state.documents = action.payload;
				state.documentsStatus = 'ready';
			})
			.addCase(removeDocuments.rejected, (state, action) => {
				state.documentsStatus = 'error';
				state.documentsError = action.error.message || 'Failed to remove resources';
			});
	},
});

export const {
	handleWorkspaceChanged,
	handleRecentRemoved,
	handleWorkspaceDeleted,
	clearDeletionReason,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
