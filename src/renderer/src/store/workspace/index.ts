/** Workspace slice public barrel — re-exports state, actions, reducer, and selectors. */
// State
export type { WorkspaceState } from './state';
export { initialState } from './state';

// Async thunks
export {
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

// Reducer, slice, and synchronous actions
export {
	workspaceSlice,
	handleWorkspaceChanged,
	handleRecentRemoved,
	handleWorkspaceDeleted,
	clearDeletionReason,
	resourceRemoved,
	importResourcesRequested,
	importResourcesCompleted,
} from './reducer';
export { default } from './reducer';

// Selectors
export {
	selectWorkspaceState,
	selectCurrentWorkspacePath,
	selectHasWorkspace,
	selectWorkspaceName,
	selectRecentWorkspaces,
	selectWorkspaceStatus,
	selectWorkspaceError,
	selectWorkspaceIsLoading,
	selectWorkspaceDeletionReason,
	selectProjectName,
	selectResources,
	selectResourcesStatus,
	selectResourcesError,
	selectResourcesIsLoading,
	selectImporting,
	selectIndexingInfo,
} from './selectors';
