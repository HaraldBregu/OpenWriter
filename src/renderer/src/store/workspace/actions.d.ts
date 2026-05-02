import type { CreateWorkspaceParams, IndexingInfo, ResourceInfo, WorkspaceInfo } from '../../../../shared/types';
import type { AppDispatch } from '../index';
/**
 * Load the current workspace path from the main process.
 * Called once on app startup to hydrate the Redux store.
 */
export declare const loadCurrentWorkspace: import("@reduxjs/toolkit").AsyncThunk<string | null, void, import("@reduxjs/toolkit").AsyncThunkConfig>;
/**
 * Load every managed workspace from `{userData}/workspaces/`.
 */
export declare const listWorkspaces: import("@reduxjs/toolkit").AsyncThunk<WorkspaceInfo[], void, import("@reduxjs/toolkit").AsyncThunkConfig>;
/**
 * Set the current workspace by path.
 * Updates both the main process and the Redux store.
 */
export declare const selectWorkspace: import("@reduxjs/toolkit").AsyncThunk<string, string, import("@reduxjs/toolkit").AsyncThunkConfig>;
/**
 * Create a new managed workspace and immediately switch to it.
 * Returns the newly created workspace info.
 */
export declare const createWorkspace: import("@reduxjs/toolkit").AsyncThunk<WorkspaceInfo, CreateWorkspaceParams, import("@reduxjs/toolkit").AsyncThunkConfig>;
/**
 * Clear the current workspace.
 */
export declare const clearWorkspace: import("@reduxjs/toolkit").AsyncThunk<null, void, import("@reduxjs/toolkit").AsyncThunkConfig>;
/**
 * Load the project name and description from workspace metadata.
 */
export declare const loadProjectName: import("@reduxjs/toolkit").AsyncThunk<{
    name: string | null;
    description: string | null;
}, void, import("@reduxjs/toolkit").AsyncThunkConfig>;
/**
 * Load the indexing info (last indexed timestamp, counts) from the workspace.
 */
export declare const loadIndexingInfo: import("@reduxjs/toolkit").AsyncThunk<IndexingInfo | null, void, import("@reduxjs/toolkit").AsyncThunkConfig>;
/**
 * Load all resources from the current workspace.
 */
export declare const loadResources: import("@reduxjs/toolkit").AsyncThunk<ResourceInfo[], void, import("@reduxjs/toolkit").AsyncThunkConfig>;
/**
 * Remove resources by their IDs, then reload the full list.
 */
export declare const removeResources: import("@reduxjs/toolkit").AsyncThunk<ResourceInfo[], string[], import("@reduxjs/toolkit").AsyncThunkConfig>;
export declare const loadDocuments: import("@reduxjs/toolkit").AsyncThunk<void, void, {
    dispatch: AppDispatch;
    state?: unknown;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const refreshDocument: import("@reduxjs/toolkit").AsyncThunk<void, string, {
    dispatch: AppDispatch;
    state?: unknown;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
