/** Workspace async thunks — IPC calls for loading, selecting, and clearing workspaces. */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { documentsLoadingStarted, documentsLoaded, documentsLoadingFailed, documentUpdated, } from './reducer';
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
 * Load every managed workspace from `{userData}/workspaces/`.
 */
export const listWorkspaces = createAsyncThunk('workspace/list', async () => {
    return await window.workspace.list();
});
/**
 * Set the current workspace by path.
 * Updates both the main process and the Redux store.
 */
export const selectWorkspace = createAsyncThunk('workspace/select', async (workspacePath) => {
    await window.workspace.setCurrent(workspacePath);
    return workspacePath;
});
/**
 * Create a new managed workspace and immediately switch to it.
 * Returns the newly created workspace info.
 */
export const createWorkspace = createAsyncThunk('workspace/create', async (params) => {
    const info = await window.workspace.create(params);
    await window.workspace.setCurrent(info.path);
    return info;
});
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
export const loadProjectName = createAsyncThunk('workspace/loadProjectName', async () => {
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
export const loadIndexingInfo = createAsyncThunk('workspace/loadIndexingInfo', async () => {
    return await window.workspace.getIndexingInfo();
});
// ---------------------------------------------------------------------------
// Resource thunks
// ---------------------------------------------------------------------------
/**
 * Load all resources from the current workspace.
 */
export const loadResources = createAsyncThunk('workspace/loadResources', async () => {
    return await window.workspace.loadDocuments();
});
/**
 * Remove resources by their IDs, then reload the full list.
 */
export const removeResources = createAsyncThunk('workspace/removeResources', async (ids) => {
    await Promise.all(ids.map((id) => window.workspace.deleteDocument(id)));
    return await window.workspace.loadDocuments();
});
// ---------------------------------------------------------------------------
// Document item thunks (merged from former documents slice)
// ---------------------------------------------------------------------------
function toDocumentItem(f) {
    return {
        id: f.id,
        title: f.metadata.title || '',
        path: f.path,
        createdAt: f.savedAt,
        updatedAt: f.savedAt,
    };
}
export const loadDocuments = createAsyncThunk('workspace/loadDocuments', async (_, { dispatch }) => {
    dispatch(documentsLoadingStarted());
    try {
        const files = await window.workspace.loadOutputsByType('documents');
        dispatch(documentsLoaded(files.map(toDocumentItem)));
    }
    catch (err) {
        dispatch(documentsLoadingFailed(err instanceof Error ? err.message : String(err)));
    }
});
export const refreshDocument = createAsyncThunk('workspace/refreshDocument', async (id, { dispatch }) => {
    try {
        const file = await window.workspace.loadOutput({ type: 'documents', id });
        if (file)
            dispatch(documentUpdated(toDocumentItem(file)));
    }
    catch {
        // silently ignore — stale state is acceptable for a single refresh
    }
});
