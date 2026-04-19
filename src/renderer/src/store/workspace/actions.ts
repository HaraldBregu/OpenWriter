/** Workspace async thunks — IPC calls for loading, selecting, and clearing workspaces. */
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { IndexingInfo, ResourceInfo, WorkspaceInfo } from '../../../../shared/types';
import type { AppDispatch } from '../index';
import type { DocumentItem } from './types';
import {
	documentsLoadingStarted,
	documentsLoaded,
	documentsLoadingFailed,
	documentUpdated,
} from './reducer';

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
// Project info thunks
// ---------------------------------------------------------------------------

/**
 * Load the project name and description from workspace metadata.
 */
export const loadProjectName = createAsyncThunk<{
	name: string | null;
	description: string | null;
}>('workspace/loadProjectName', async () => {
	const info = await window.workspace.getProjectInfo();
	return {
		name: info?.name ?? null,
		description: info?.description ?? null,
	};
});

// ---------------------------------------------------------------------------
// Indexing thunks
// ---------------------------------------------------------------------------

/**
 * Load the indexing info (last indexed timestamp, counts) from the workspace.
 */
export const loadIndexingInfo = createAsyncThunk<IndexingInfo | null>(
	'workspace/loadIndexingInfo',
	async () => {
		return await window.workspace.getIndexingInfo();
	}
);

// ---------------------------------------------------------------------------
// Resource thunks
// ---------------------------------------------------------------------------

/**
 * Load all resources from the current workspace.
 */
export const loadResources = createAsyncThunk<ResourceInfo[]>(
	'workspace/loadResources',
	async () => {
		return await window.workspace.loadDocuments();
	}
);

/**
 * Remove resources by their IDs, then reload the full list.
 */
export const removeResources = createAsyncThunk<ResourceInfo[], string[]>(
	'workspace/removeResources',
	async (ids) => {
		await Promise.all(ids.map((id) => window.workspace.deleteDocument(id)));
		return await window.workspace.loadDocuments();
	}
);

// ---------------------------------------------------------------------------
// Document item thunks (merged from former documents slice)
// ---------------------------------------------------------------------------

function toDocumentItem(f: {
	id: string;
	path: string;
	metadata: { title?: string };
	savedAt: number;
}): DocumentItem {
	return {
		id: f.id,
		title: (f.metadata.title as string) || '',
		path: f.path,
		createdAt: f.savedAt,
		updatedAt: f.savedAt,
	};
}

export const loadDocuments = createAsyncThunk<void, void, { dispatch: AppDispatch }>(
	'workspace/loadDocuments',
	async (_, { dispatch }) => {
		dispatch(documentsLoadingStarted());
		try {
			const files = await window.workspace.loadOutputsByType('documents');
			dispatch(documentsLoaded(files.map(toDocumentItem)));
		} catch (err) {
			dispatch(documentsLoadingFailed(err instanceof Error ? err.message : String(err)));
		}
	}
);

export const refreshDocument = createAsyncThunk<void, string, { dispatch: AppDispatch }>(
	'workspace/refreshDocument',
	async (id, { dispatch }) => {
		try {
			const file = await window.workspace.loadOutput({ type: 'documents', id });
			if (file) dispatch(documentUpdated(toDocumentItem(file)));
		} catch {
			// silently ignore — stale state is acceptable for a single refresh
		}
	}
);
