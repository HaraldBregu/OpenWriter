/** Workspace slice public barrel — re-exports state, actions, reducer, and selectors. */
export type { WorkspaceState } from './state';
export type { DocumentItem } from './types';
export { initialState } from './state';
export { loadCurrentWorkspace, listWorkspaces, selectWorkspace, createWorkspace, clearWorkspace, loadResources, removeResources, loadIndexingInfo, loadProjectName, loadDocuments, refreshDocument, } from './actions';
export { workspaceSlice, handleWorkspaceChanged, handleWorkspaceDeleted, clearDeletionReason, resourceRemoved, importResourcesRequested, importResourcesCompleted, documentsLoaded, documentAdded, documentUpdated, documentMetadataPatched, documentRemoved, documentSelected, documentsLoadingStarted, documentsLoadingFailed, } from './reducer';
export { default } from './reducer';
export { selectWorkspaceState, selectCurrentWorkspacePath, selectHasWorkspace, selectWorkspaceName, selectWorkspaces, selectWorkspaceStatus, selectWorkspaceError, selectWorkspaceIsLoading, selectWorkspaceDeletionReason, selectProjectName, selectProjectDescription, selectResources, selectResourcesStatus, selectResourcesError, selectResourcesIsLoading, selectImporting, selectIndexingInfo, selectAllDocuments, selectSelectedDocument, selectSelectedDocumentId, selectDocumentsStatus, selectDocumentsError, selectDocumentById, } from './selectors';
