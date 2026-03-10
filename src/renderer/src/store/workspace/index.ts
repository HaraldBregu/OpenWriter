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
	resourceIndexingFinished,
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
	selectResources,
	selectResourcesStatus,
	selectResourcesError,
	selectResourcesIsLoading,
	selectImporting,
	selectResourceIndexingTaskId,
} from './selectors';
