// State
export type { WorkspaceState } from './state'
export { initialState } from './state'

// Async thunks
export {
  loadCurrentWorkspace,
  loadRecentWorkspaces,
  selectWorkspace,
  openWorkspacePicker,
  removeRecentWorkspace,
  clearWorkspace,
} from './actions'

// Reducer, slice, and synchronous actions
export {
  workspaceSlice,
  handleWorkspaceChanged,
  handleRecentRemoved,
  handleWorkspaceDeleted,
  clearDeletionReason,
} from './reducer'
export { default } from './reducer'

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
} from './selectors'
