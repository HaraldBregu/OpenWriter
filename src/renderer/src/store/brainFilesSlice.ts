import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './index'

// ---------------------------------------------------------------------------
// Types (matching the main process BrainFilesService)
// ---------------------------------------------------------------------------

export interface BrainFileMetadata {
  sectionId: string
  title?: string
  createdAt: number
  updatedAt: number
  tags?: string[]
  [key: string]: unknown
}

export interface BrainFile {
  id: string // filename without extension (timestamp)
  sectionId: string
  path: string
  metadata: BrainFileMetadata
  content: string
  savedAt: number
}

export interface SaveBrainFileInput {
  sectionId: string
  content: string
  metadata?: Partial<BrainFileMetadata>
}

export interface SaveBrainFileResult {
  id: string
  path: string
  savedAt: number
}

type SectionId = 'principles' | 'consciousness' | 'memory' | 'reasoning' | 'perception'

interface BrainFilesState {
  files: {
    principles: BrainFile[]
    consciousness: BrainFile[]
    memory: BrainFile[]
    reasoning: BrainFile[]
    perception: BrainFile[]
  }
  loading: boolean
  error: string | null
  lastSaved: {
    fileId: string
    timestamp: number
  } | null
}

const initialState: BrainFilesState = {
  files: {
    principles: [],
    consciousness: [],
    memory: [],
    reasoning: [],
    perception: []
  },
  loading: false,
  error: null,
  lastSaved: null
}

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

/**
 * Save a brain conversation file to the workspace.
 */
export const saveBrainFile = createAsyncThunk(
  'brainFiles/save',
  async (input: SaveBrainFileInput, { rejectWithValue }) => {
    try {
      const result = await window.api.brainSave(input)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save brain file'
      return rejectWithValue(errorMessage)
    }
  }
)

/**
 * Load all brain files from the workspace.
 */
export const loadBrainFiles = createAsyncThunk(
  'brainFiles/loadAll',
  async (_, { rejectWithValue }) => {
    try {
      const files = await window.api.brainLoadAll()
      return files
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load brain files'
      return rejectWithValue(errorMessage)
    }
  }
)

/**
 * Delete a brain file from the workspace.
 */
export const deleteBrainFile = createAsyncThunk(
  'brainFiles/delete',
  async (
    params: { id: string; sectionId: string },
    { rejectWithValue }
  ) => {
    try {
      await window.api.brainDelete(params)
      return params
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete brain file'
      return rejectWithValue(errorMessage)
    }
  }
)

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const brainFilesSlice = createSlice({
  name: 'brainFiles',
  initialState,
  reducers: {
    /**
     * Clear error state
     */
    clearError(state) {
      state.error = null
    },

    /**
     * Clear last saved notification
     */
    clearLastSaved(state) {
      state.lastSaved = null
    }
  },
  extraReducers: (builder) => {
    // Save brain file
    builder
      .addCase(saveBrainFile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(saveBrainFile.fulfilled, (state, action: PayloadAction<SaveBrainFileResult>) => {
        state.loading = false

        // Track last saved for UI feedback
        state.lastSaved = {
          fileId: action.payload.id,
          timestamp: Date.now()
        }

        // Note: We don't add the file to state here because we need to load
        // the full file (with content) from the backend. The loadBrainFiles
        // action should be called after save to refresh the list.
      })
      .addCase(saveBrainFile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Load all brain files
    builder
      .addCase(loadBrainFiles.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadBrainFiles.fulfilled, (state, action: PayloadAction<BrainFile[]>) => {
        state.loading = false

        // Reset all sections
        state.files = {
          principles: [],
          consciousness: [],
          memory: [],
          reasoning: [],
          perception: []
        }

        // Distribute files into their sections
        action.payload.forEach((file) => {
          const sectionId = file.sectionId as SectionId
          if (state.files[sectionId]) {
            state.files[sectionId].push(file)
          }
        })

        // Sort files by savedAt (most recent first) in each section
        Object.keys(state.files).forEach((sectionId) => {
          const section = state.files[sectionId as SectionId]
          section.sort((a, b) => b.savedAt - a.savedAt)
        })
      })
      .addCase(loadBrainFiles.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Delete brain file
    builder
      .addCase(deleteBrainFile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        deleteBrainFile.fulfilled,
        (state, action: PayloadAction<{ id: string; sectionId: string }>) => {
          state.loading = false
          const { id, sectionId } = action.payload
          const section = state.files[sectionId as SectionId]
          if (section) {
            state.files[sectionId as SectionId] = section.filter((f) => f.id !== id)
          }
        }
      )
      .addCase(deleteBrainFile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  }
})

export const { clearError, clearLastSaved } = brainFilesSlice.actions

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/**
 * Select all brain files
 */
export const selectAllBrainFiles = (state: RootState): BrainFilesState['files'] =>
  state.brainFiles.files

/**
 * Select files for a specific section
 */
export const selectBrainFilesBySection = (
  sectionId: SectionId
) =>
  createSelector(
    [selectAllBrainFiles],
    (files): BrainFile[] => files[sectionId]
  )

/**
 * Select a specific brain file by ID and section
 */
export const selectBrainFileById = (
  id: string,
  sectionId: SectionId
) =>
  createSelector(
    [selectBrainFilesBySection(sectionId)],
    (files): BrainFile | null => files.find((f) => f.id === id) ?? null
  )

/**
 * Select loading state
 */
export const selectBrainFilesLoading = (state: RootState): boolean =>
  state.brainFiles.loading

/**
 * Select error state
 */
export const selectBrainFilesError = (state: RootState): string | null =>
  state.brainFiles.error

/**
 * Select last saved info (for UI feedback)
 */
export const selectLastSaved = (state: RootState): BrainFilesState['lastSaved'] =>
  state.brainFiles.lastSaved

/**
 * Select total count of brain files across all sections
 */
export const selectTotalBrainFilesCount = createSelector(
  [selectAllBrainFiles],
  (files): number =>
    Object.values(files).reduce((total, section) => total + section.length, 0)
)

/**
 * Select count of files per section
 */
export const selectBrainFilesCountBySection = createSelector(
  [selectAllBrainFiles],
  (files): Record<SectionId, number> => ({
    principles: files.principles.length,
    consciousness: files.consciousness.length,
    memory: files.memory.length,
    reasoning: files.reasoning.length,
    perception: files.perception.length
  })
)

export default brainFilesSlice.reducer
