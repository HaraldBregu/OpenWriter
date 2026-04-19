/** Workspace slice public barrel — re-exports state, actions, reducer, and selectors. */
// Types
export type { WorkspaceState } from './state';
export type { DocumentItem } from './types';
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
	loadDocuments,
	refreshDocument,
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
	documentsLoaded,
	documentAdded,
	documentUpdated,
	documentMetadataPatched,
	documentRemoved,
	documentSelected,
	documentsLoadingStarted,
	documentsLoadingFailed,
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
	selectProjectDescription,
	selectResources,
	selectResourcesStatus,
	selectResourcesError,
	selectResourcesIsLoading,
	selectImporting,
	selectIndexingInfo,
	selectAllDocuments,
	selectSelectedDocument,
	selectSelectedDocumentId,
	selectDocumentsStatus,
	selectDocumentsError,
	selectDocumentById,
} from './selectors';
