import { createAsyncThunk, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './index'
import type { WorkspaceInfo } from '../../../shared/types/ipc/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkspaceState {
  currentPath: string | null
  recentWorkspaces: WorkspaceInfo[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
}

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

/**
 * Load the current workspace path from the main process.
 * This is called once on app startup to hydrate the Redux store.
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
export const loadRecentWorkspaces = createAsyncThunk(
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

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const initialState: WorkspaceState = {
  currentPath: null,
  recentWorkspaces: [],
  status: 'idle',
  error: null
}

export const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    /**
     * Handle workspace change events from the main process.
     * Called when window.workspace.onChange() fires.
     */
    handleWorkspaceChanged: (
      state,
      action: PayloadAction<{ currentPath: string | null; previousPath: string | null }>
    ) => {
      state.currentPath = action.payload.currentPath
      state.status = 'ready'
      state.error = null
    },

    /**
     * Handle external removal of a recent workspace.
     */
    handleRecentRemoved: (state, action: PayloadAction<string>) => {
      state.recentWorkspaces = state.recentWorkspaces.filter(
        (ws) => ws.path !== action.payload
      )
    }
  },
  extraReducers: (builder) => {
    // loadCurrentWorkspace
    builder
      .addCase(loadCurrentWorkspace.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadCurrentWorkspace.fulfilled, (state, action) => {
        state.currentPath = action.payload
        state.status = 'ready'
      })
      .addCase(loadCurrentWorkspace.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.error.message || 'Failed to load current workspace'
      })

    // loadRecentWorkspaces
    builder
      .addCase(loadRecentWorkspaces.fulfilled, (state, action) => {
        state.recentWorkspaces = action.payload
      })
      .addCase(loadRecentWorkspaces.rejected, (state, action) => {
        console.error('Failed to load recent workspaces:', action.error)
      })

    // selectWorkspace
    builder
      .addCase(selectWorkspace.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(selectWorkspace.fulfilled, (state, action) => {
        state.currentPath = action.payload
        state.status = 'ready'
      })
      .addCase(selectWorkspace.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.error.message || 'Failed to select workspace'
      })

    // openWorkspacePicker
    builder
      .addCase(openWorkspacePicker.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(openWorkspacePicker.fulfilled, (state, action) => {
        if (action.payload) {
          state.currentPath = action.payload
        }
        state.status = 'ready'
      })
      .addCase(openWorkspacePicker.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.error.message || 'Failed to open workspace picker'
      })

    // removeRecentWorkspace
    builder.addCase(removeRecentWorkspace.fulfilled, (state, action) => {
      state.recentWorkspaces = state.recentWorkspaces.filter(ws => ws.path !== action.payload)
    })

    // clearWorkspace
    builder
      .addCase(clearWorkspace.fulfilled, (state) => {
        state.currentPath = null
        state.status = 'ready'
      })
      .addCase(clearWorkspace.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.error.message || 'Failed to clear workspace'
      })
  }
})

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const { handleWorkspaceChanged, handleRecentRemoved } = workspaceSlice.actions

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectWorkspaceState = (state: RootState) => state.workspace

export const selectCurrentWorkspacePath = createSelector(
  selectWorkspaceState,
  (state) => state.currentPath
)

export const selectHasWorkspace = createSelector(
  selectCurrentWorkspacePath,
  (path) => path !== null
)

export const selectWorkspaceName = createSelector(
  selectCurrentWorkspacePath,
  (path) => {
    if (!path) return null
    // Extract the folder name from the path
    const parts = path.split(/[/\\]/)
    return parts[parts.length - 1] || null
  }
)

export const selectRecentWorkspaces = createSelector(
  selectWorkspaceState,
  (state) => state.recentWorkspaces
)

export const selectWorkspaceStatus = createSelector(
  selectWorkspaceState,
  (state) => state.status
)

export const selectWorkspaceError = createSelector(
  selectWorkspaceState,
  (state) => state.error
)

export const selectWorkspaceIsLoading = createSelector(
  selectWorkspaceStatus,
  (status) => status === 'loading'
)

export default workspaceSlice.reducer
