/** Workspace slice reducer — handles sync actions and async thunk lifecycle cases. */
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { initialState } from './state';
import type { WorkspaceState } from './state';
import type { DocumentItem } from './types';
import {
	loadCurrentWorkspace,
	loadRecentWorkspaces,
	selectWorkspace,
	openWorkspacePicker,
	removeRecentWorkspace,
	clearWorkspace,
	loadResources,
	removeResources,
	loadIndexingInfo,
	loadProjectName,
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
			state.projectName = null;
			state.projectDescription = null;
			state.status = 'ready';
			state.error = null;
			state.deletionReason = action.payload.reason;
			state.resources = [];
			state.resourcesStatus = 'idle';
			state.resourcesError = null;
			state.documentItems = [];
			state.selectedDocumentId = null;
			state.documentsStatus = 'idle';
			state.documentsError = null;
		},

		/**
		 * Clear the deletion reason (e.g., after the user has acknowledged the message).
		 */
		clearDeletionReason: (state) => {
			state.deletionReason = null;
		},

		/**
		 * Remove a single resource from the store (e.g., when the watcher fires a 'removed' event).
		 */
		resourceRemoved: (state, action: PayloadAction<string>) => {
			state.resources = state.resources.filter((d) => d.id !== action.payload);
		},

		/**
		 * Triggered to start a file import operation.
		 * The listener middleware picks this up and calls the IPC method.
		 */
		importResourcesRequested: (state, _action: PayloadAction<string[]>) => {
			state.importing = true;
		},

		/**
		 * Called when the import operation completes (success or failure).
		 */
		importResourcesCompleted: (state) => {
			state.importing = false;
		},

		// -------------------------------------------------------------------
		// Document item reducers (merged from former documents slice)
		// -------------------------------------------------------------------

		/** Replace the full list of document items (e.g. after loading from disk). */
		documentsLoaded(state, action: PayloadAction<DocumentItem[]>) {
			state.documentItems = action.payload;
			state.documentsStatus = 'ready';
			state.documentsError = null;
		},

		/** Add a new document item to the list. */
		documentAdded(state, action: PayloadAction<DocumentItem>) {
			state.documentItems.push(action.payload);
		},

		/** Update an existing document item by id. */
		documentUpdated(state, action: PayloadAction<DocumentItem>) {
			const index = state.documentItems.findIndex((d) => d.id === action.payload.id);
			if (index !== -1) {
				state.documentItems[index] = action.payload;
			}
		},

		/** Patch only title and updatedAt for an existing document. */
		documentMetadataPatched(
			state,
			action: PayloadAction<{ id: string; title: string; updatedAt: number }>
		) {
			const item = state.documentItems.find((d) => d.id === action.payload.id);
			if (item) {
				item.title = action.payload.title;
				item.updatedAt = action.payload.updatedAt;
			}
		},

		/** Remove a document item by id. */
		documentRemoved(state, action: PayloadAction<string>) {
			state.documentItems = state.documentItems.filter((d) => d.id !== action.payload);
			if (state.selectedDocumentId === action.payload) {
				state.selectedDocumentId = null;
			}
		},

		/** Set the currently selected document item. */
		documentSelected(state, action: PayloadAction<string | null>) {
			state.selectedDocumentId = action.payload;
		},

		/** Set documents loading status and clear any previous error. */
		documentsLoadingStarted(state) {
			state.documentsStatus = 'loading';
			state.documentsError = null;
		},

		/** Set documents error status with a message. */
		documentsLoadingFailed(state, action: PayloadAction<string>) {
			state.documentsStatus = 'error';
			state.documentsError = action.payload;
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
				state.projectName = null;
				state.projectDescription = null;
				state.status = 'ready';
				state.resources = [];
				state.resourcesStatus = 'idle';
				state.resourcesError = null;
				state.documentItems = [];
				state.selectedDocumentId = null;
				state.documentsStatus = 'idle';
				state.documentsError = null;
			})
			.addCase(clearWorkspace.rejected, (state, action) => {
				state.status = 'error';
				state.error = action.error.message || 'Failed to clear workspace';
			});

		// loadResources
		builder
			.addCase(loadResources.pending, (state) => {
				state.resourcesStatus = 'loading';
				state.resourcesError = null;
			})
			.addCase(loadResources.fulfilled, (state, action) => {
				state.resources = action.payload;
				state.resourcesStatus = 'ready';
			})
			.addCase(loadResources.rejected, (state, action) => {
				state.resourcesStatus = 'error';
				state.resourcesError = action.error.message || 'Failed to load resources';
			});

		// removeResources
		builder
			.addCase(removeResources.pending, (state) => {
				state.resourcesStatus = 'loading';
				state.resourcesError = null;
			})
			.addCase(removeResources.fulfilled, (state, action) => {
				state.resources = action.payload;
				state.resourcesStatus = 'ready';
			})
			.addCase(removeResources.rejected, (state, action) => {
				state.resourcesStatus = 'error';
				state.resourcesError = action.error.message || 'Failed to remove resources';
			});

		// loadProjectName
		builder.addCase(loadProjectName.fulfilled, (state, action) => {
			state.projectName = action.payload.name;
			state.projectDescription = action.payload.description;
		});

		// loadIndexingInfo
		builder.addCase(loadIndexingInfo.fulfilled, (state, action) => {
			state.indexingInfo = action.payload;
		});
	},
});

export const {
	handleWorkspaceChanged,
	handleRecentRemoved,
	handleWorkspaceDeleted,
	clearDeletionReason,
	resourceRemoved,
	importResourcesRequested,
	importResourcesCompleted,
	documentsLoaded,
	documentAdded,
	documentUpdated,
	documentMetadataPatched,
	documentRemoved,
	documentSelected,
	documentsLoadingStarted,
	documentsLoadingFailed,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
