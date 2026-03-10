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
	loadDocuments,
	removeDocuments,
} from './actions';

// Reducer, slice, and synchronous actions
export {
	workspaceSlice,
	handleWorkspaceChanged,
	handleRecentRemoved,
	handleWorkspaceDeleted,
	clearDeletionReason,
	documentRemoved,
	importDocumentsRequested,
	importDocumentsCompleted,
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
	selectDocuments,
	selectDocumentsStatus,
	selectDocumentsError,
	selectDocumentsIsLoading,
	selectImporting,
} from './selectors';
