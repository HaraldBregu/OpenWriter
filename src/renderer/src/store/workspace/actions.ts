import { createAsyncThunk } from '@reduxjs/toolkit'
import type { WorkspaceInfo } from '../../../../shared/types'

// ---------------------------------------------------------------------------
// Async thunks
// ---------------------------------------------------------------------------

/**
 * Load the current workspace path from the main process.
 * Called once on app startup to hydrate the Redux store.
 */
export const loadCurrentWorkspace = createAsyncThunk(
  'workspace/loadCurrent',
  async () => {
    const currentPath = await window.workspace.getCurrent()
    return currentPath
  }
)

/**
 * Load the list of recent workspaces from the main process.
 */
export const loadRecentWorkspaces = createAsyncThunk<WorkspaceInfo[]>(
  'workspace/loadRecent',
  async () => {
    const recent = await window.workspace.getRecent()
    return recent
  }
)

/**
 * Set the current workspace by path.
 * Updates both the main process and the Redux store.
 */
export const selectWorkspace = createAsyncThunk(
  'workspace/select',
  async (workspacePath: string) => {
    await window.workspace.setCurrent(workspacePath)
    return workspacePath
  }
)

/**
 * Open a folder picker and select a workspace.
 */
export const openWorkspacePicker = createAsyncThunk(
  'workspace/openPicker',
  async () => {
    const selectedPath = await window.workspace.selectFolder()
    if (selectedPath) {
      await window.workspace.setCurrent(selectedPath)
    }
    return selectedPath
  }
)

/**
 * Remove a workspace from the recent workspaces list.
 */
export const removeRecentWorkspace = createAsyncThunk(
  'workspace/removeRecent',
  async (workspacePath: string) => {
    await window.workspace.removeRecent(workspacePath)
    return workspacePath
  }
)

/**
 * Clear the current workspace.
 */
export const clearWorkspace = createAsyncThunk(
  'workspace/clear',
  async () => {
    await window.workspace.clear()
    return null
  }
)

// Re-export synchronous actions from the reducer so callers can import
// everything workspace-action-related from this single file.
export {
  handleWorkspaceChanged,
  handleRecentRemoved,
  handleWorkspaceDeleted,
  clearDeletionReason,
} from './reducer'
