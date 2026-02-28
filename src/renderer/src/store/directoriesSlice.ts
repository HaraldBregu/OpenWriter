import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IndexedDirectory {
  id: string
  path: string
  addedAt: number
  isIndexed: boolean
  lastIndexedAt?: number
}

export interface DirectoriesState {
  directories: IndexedDirectory[]
  isLoading: boolean
  error: string | null
}

const initialState: DirectoriesState = {
  directories: [],
  isLoading: false,
  error: null
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const directoriesSlice = createSlice({
  name: 'directories',
  initialState,
  reducers: {
    /**
     * Set loading state (used while loading from main process).
     */
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },

    /**
     * Set error state.
     */
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },

    /**
     * Load all directories from the main process.
     * Replaces the entire list.
     */
    loadDirectories(state, action: PayloadAction<IndexedDirectory[]>) {
      state.directories = action.payload
      state.isLoading = false
      state.error = null
    },

    /**
     * Add a single directory (optimistic update after IPC success).
     */
    addDirectory(state, action: PayloadAction<IndexedDirectory>) {
      // Avoid duplicates by ID
      if (!state.directories.some((d) => d.id === action.payload.id)) {
        state.directories.push(action.payload)
      }
      state.error = null
    },

    /**
     * Add multiple directories (after bulk IPC success).
     */
    addDirectories(state, action: PayloadAction<IndexedDirectory[]>) {
      for (const dir of action.payload) {
        if (!state.directories.some((d) => d.id === dir.id)) {
          state.directories.push(dir)
        }
      }
      state.error = null
    },

    /**
     * Remove a directory by ID.
     */
    removeDirectory(state, action: PayloadAction<string>) {
      state.directories = state.directories.filter((d) => d.id !== action.payload)
    },

    /**
     * Update a directory's indexing status.
     */
    markDirectoryIndexed(
      state,
      action: PayloadAction<{ id: string; isIndexed: boolean; lastIndexedAt?: number }>
    ) {
      const dir = state.directories.find((d) => d.id === action.payload.id)
      if (dir) {
        dir.isIndexed = action.payload.isIndexed
        if (action.payload.lastIndexedAt) {
          dir.lastIndexedAt = action.payload.lastIndexedAt
        }
      }
    },

    /**
     * Handle external directory changes pushed from the main process
     * via the directories:changed event.
     */
    handleExternalDirectoriesChange(state, action: PayloadAction<IndexedDirectory[]>) {
      state.directories = action.payload
    },

    /**
     * Clear all directories (used when workspace changes).
     */
    clearDirectories(state) {
      state.directories = []
      state.error = null
    }
  }
})

export const {
  setLoading,
  setError,
  loadDirectories,
  addDirectory,
  addDirectories,
  removeDirectory,
  markDirectoryIndexed,
  handleExternalDirectoriesChange,
  clearDirectories
} = directoriesSlice.actions

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectDirectories = (state: { directories: DirectoriesState }): IndexedDirectory[] =>
  state.directories.directories

export const selectDirectoriesLoading = (state: { directories: DirectoriesState }): boolean =>
  state.directories.isLoading

export const selectDirectoriesError = (state: { directories: DirectoriesState }): string | null =>
  state.directories.error

export const selectDirectoryCount = createSelector(
  [selectDirectories],
  (dirs): number => dirs.length
)

export const selectIndexedCount = createSelector(
  [selectDirectories],
  (dirs): number => dirs.filter((d) => d.isIndexed).length
)

export const selectPendingCount = createSelector(
  [selectDirectories],
  (dirs): number => dirs.filter((d) => !d.isIndexed).length
)

export default directoriesSlice.reducer
