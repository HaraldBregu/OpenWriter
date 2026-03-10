/** Workspace async thunks — IPC calls for loading, selecting, and clearing workspaces. */
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { DocumentInfo, WorkspaceInfo } from '../../../../shared/types';

// ---------------------------------------------------------------------------
// Async thunks
// ---------------------------------------------------------------------------

/**
 * Load the current workspace path from the main process.
 * Called once on app startup to hydrate the Redux store.
 */
export const loadCurrentWorkspace = createAsyncThunk('workspace/loadCurrent', async () => {
	const currentPath = await window.workspace.getCurrent();
	return currentPath;
});

/**
 * Load the list of recent workspaces from the main process.
 */
export const loadRecentWorkspaces = createAsyncThunk<WorkspaceInfo[]>(
	'workspace/loadRecent',
	async () => {
		const recent = await window.workspace.getRecent();
		return recent;
	}
);

/**
 * Set the current workspace by path.
 * Updates both the main process and the Redux store.
 */
export const selectWorkspace = createAsyncThunk(
	'workspace/select',
	async (workspacePath: string) => {
		await window.workspace.setCurrent(workspacePath);
		return workspacePath;
	}
);

/**
 * Open a folder picker and select a workspace.
 */
export const openWorkspacePicker = createAsyncThunk('workspace/openPicker', async () => {
	const selectedPath = await window.workspace.selectFolder();
	if (selectedPath) {
		await window.workspace.setCurrent(selectedPath);
	}
	return selectedPath;
});

/**
 * Remove a workspace from the recent workspaces list.
 */
export const removeRecentWorkspace = createAsyncThunk(
	'workspace/removeRecent',
	async (workspacePath: string) => {
		await window.workspace.removeRecent(workspacePath);
		return workspacePath;
	}
);

/**
 * Clear the current workspace.
 */
export const clearWorkspace = createAsyncThunk('workspace/clear', async () => {
	await window.workspace.clear();
	return null;
});

// ---------------------------------------------------------------------------
// Document thunks
// ---------------------------------------------------------------------------

/**
 * Load all documents from the current workspace.
 */
export const loadDocuments = createAsyncThunk<DocumentInfo[]>(
	'workspace/loadDocuments',
	async () => {
		return await window.workspace.loadDocuments();
	}
);

/**
 * Remove documents by their IDs, then reload the full list.
 */
export const removeDocuments = createAsyncThunk<DocumentInfo[], string[]>(
	'workspace/removeDocuments',
	async (ids) => {
		await Promise.all(ids.map((id) => window.workspace.deleteDocument(id)));
		return await window.workspace.loadDocuments();
	}
);

/**
 * Submit an index-resources task to the main process.
 * The main process resolves workspace path and documents server-side.
 * Returns the task ID for progress tracking.
 */
export const indexResources = createAsyncThunk<string>(
	'workspace/indexResources',
	async (_, { rejectWithValue }) => {
		const result = await window.task.submit('index-resources', {});
		if (!result.success) {
			return rejectWithValue(result.error.message);
		}
		return result.data.taskId;
	}
);
