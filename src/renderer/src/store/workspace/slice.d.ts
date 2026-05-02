/**
 * @deprecated This file is a compatibility facade.
 * Import from the split files directly:
 *   - State:     '@/store/workspace/state'
 *   - Actions:   '@/store/workspace/actions'
 *   - Selectors: '@/store/workspace/selectors'
 *   - Reducer:   '@/store/workspace/reducer'
 *   - Barrel:    '@/store/workspace'
 */
export type { WorkspaceState } from './state';
export { loadCurrentWorkspace, listWorkspaces, selectWorkspace, createWorkspace, clearWorkspace, } from './actions';
export { workspaceSlice, handleWorkspaceChanged, handleWorkspaceDeleted, clearDeletionReason, } from './reducer';
export { default } from './reducer';
export { selectWorkspaceState, selectCurrentWorkspacePath, selectHasWorkspace, selectWorkspaceName, selectWorkspaces, selectWorkspaceStatus, selectWorkspaceError, selectWorkspaceIsLoading, selectWorkspaceDeletionReason, } from './selectors';
