/** Workspace state selectors. */
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export const selectWorkspaceState = (state: RootState) => state.workspace;

export const selectCurrentWorkspacePath = createSelector(
	selectWorkspaceState,
	(state) => state.currentPath
);

export const selectHasWorkspace = createSelector(
	selectCurrentWorkspacePath,
	(path) => path !== null
);

export const selectWorkspaceName = createSelector(selectCurrentWorkspacePath, (path) => {
	if (!path) return null;
	// Extract the folder name from the path
	const parts = path.split(/[/\\]/);
	return parts[parts.length - 1] || null;
});

export const selectRecentWorkspaces = createSelector(
	selectWorkspaceState,
	(state) => state.recentWorkspaces
);

export const selectWorkspaceStatus = createSelector(selectWorkspaceState, (state) => state.status);

export const selectWorkspaceError = createSelector(selectWorkspaceState, (state) => state.error);

export const selectWorkspaceIsLoading = createSelector(
	selectWorkspaceStatus,
	(status) => status === 'loading'
);

export const selectWorkspaceDeletionReason = createSelector(
	selectWorkspaceState,
	(state) => state.deletionReason
);

// ---------------------------------------------------------------------------
// Resource selectors
// ---------------------------------------------------------------------------

export const selectResources = createSelector(selectWorkspaceState, (state) => state.resources);

export const selectResourcesStatus = createSelector(
	selectWorkspaceState,
	(state) => state.resourcesStatus
);

export const selectResourcesError = createSelector(
	selectWorkspaceState,
	(state) => state.resourcesError
);

export const selectResourcesIsLoading = createSelector(
	selectResourcesStatus,
	(status) => status === 'loading'
);

export const selectImporting = createSelector(selectWorkspaceState, (state) => state.importing);

// ---------------------------------------------------------------------------
// Indexing selectors
// ---------------------------------------------------------------------------

export const selectIndexingInfo = createSelector(
	selectWorkspaceState,
	(state) => state.indexingInfo
);
