import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './index'

// ---------------------------------------------------------------------------
// Types (matching the main process PersonalityFilesService)
// ---------------------------------------------------------------------------

export interface PersonalityFileMetadata {
  title: string
  provider: string
  model: string
  temperature?: number
  maxTokens?: number | null
  reasoning?: boolean
  createdAt?: string
  [key: string]: unknown
}

export interface PersonalityFile {
  id: string // filename without extension (timestamp)
  sectionId: string
  path: string
  metadata: PersonalityFileMetadata
  content: string
  savedAt: number
}

export interface SavePersonalityFileInput {
  sectionId: string
  content: string
  metadata?: Partial<PersonalityFileMetadata>
}

export interface SavePersonalityFileResult {
  id: string
  path: string
  savedAt: number
}

export type PersonalitySectionId =
  | 'emotional-depth'
  | 'consciousness'
  | 'motivation'
  | 'moral-intuition'
  | 'irrationality'
  | 'growth'
  | 'social-identity'
  | 'creativity'
  | 'mortality'
  | 'contradiction'

export interface PersonalityFilesState {
  files: {
    'emotional-depth': PersonalityFile[]
    consciousness: PersonalityFile[]
    motivation: PersonalityFile[]
    'moral-intuition': PersonalityFile[]
    irrationality: PersonalityFile[]
    growth: PersonalityFile[]
    'social-identity': PersonalityFile[]
    creativity: PersonalityFile[]
    mortality: PersonalityFile[]
    contradiction: PersonalityFile[]
  }
  loading: boolean
  error: string | null
  lastSaved: {
    fileId: string
    timestamp: number
  } | null
}

const initialState: PersonalityFilesState = {
  files: {
    'emotional-depth': [],
    consciousness: [],
    motivation: [],
    'moral-intuition': [],
    irrationality: [],
    growth: [],
    'social-identity': [],
    creativity: [],
    mortality: [],
    contradiction: []
  },
  loading: false,
  error: null,
  lastSaved: null
}

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

/**
 * Save a personality conversation file to the workspace.
 */
export const savePersonalityFile = createAsyncThunk(
  'personalityFiles/save',
  async (input: SavePersonalityFileInput, { rejectWithValue }) => {
    try {
      const result = await window.workspace.savePersonality(input)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save personality file'
      return rejectWithValue(errorMessage)
    }
  }
)

/**
 * Load all personality files from the workspace.
 */
export const loadPersonalityFiles = createAsyncThunk(
  'personalityFiles/loadAll',
  async (_, { rejectWithValue }) => {
    try {
      const files = await window.workspace.loadPersonalities()
      return files
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load personality files'
      return rejectWithValue(errorMessage)
    }
  }
)

/**
 * Delete a personality file from the workspace.
 */
export const deletePersonalityFile = createAsyncThunk(
  'personalityFiles/delete',
  async (
    params: { id: string; sectionId: string },
    { rejectWithValue }
  ) => {
    try {
      await window.workspace.deletePersonality(params)
      return params
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete personality file'
      return rejectWithValue(errorMessage)
    }
  }
)

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const personalityFilesSlice = createSlice({
  name: 'personalityFiles',
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
    // Save personality file
    builder
      .addCase(savePersonalityFile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(savePersonalityFile.fulfilled, (state, action: PayloadAction<SavePersonalityFileResult>) => {
        state.loading = false

        // Track last saved for UI feedback
        state.lastSaved = {
          fileId: action.payload.id,
          timestamp: Date.now()
        }

        // Note: We don't add the file to state here because we need to load
        // the full file (with content) from the backend. The loadPersonalityFiles
        // action should be called after save to refresh the list.
      })
      .addCase(savePersonalityFile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Load all personality files
    builder
      .addCase(loadPersonalityFiles.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadPersonalityFiles.fulfilled, (state, action: PayloadAction<PersonalityFile[]>) => {
        state.loading = false

        // Reset all sections
        state.files = {
          'emotional-depth': [],
          consciousness: [],
          motivation: [],
          'moral-intuition': [],
          irrationality: [],
          growth: [],
          'social-identity': [],
          creativity: [],
          mortality: [],
          contradiction: []
        }

        // Distribute files into their sections
        action.payload.forEach((file) => {
          const sectionId = file.sectionId as PersonalitySectionId
          if (state.files[sectionId]) {
            state.files[sectionId].push(file)
          }
        })

        // Sort files by savedAt (most recent first) in each section
        Object.keys(state.files).forEach((sectionId) => {
          const section = state.files[sectionId as PersonalitySectionId]
          section.sort((a, b) => b.savedAt - a.savedAt)
        })
      })
      .addCase(loadPersonalityFiles.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Delete personality file
    builder
      .addCase(deletePersonalityFile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        deletePersonalityFile.fulfilled,
        (state, action: PayloadAction<{ id: string; sectionId: string }>) => {
          state.loading = false
          const { id, sectionId } = action.payload
          const section = state.files[sectionId as PersonalitySectionId]
          if (section) {
            state.files[sectionId as PersonalitySectionId] = section.filter((f) => f.id !== id)
          }
        }
      )
      .addCase(deletePersonalityFile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  }
})

export const { clearError, clearLastSaved } = personalityFilesSlice.actions

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/**
 * Select all personality files
 */
export const selectAllPersonalityFiles = (state: RootState): PersonalityFilesState['files'] =>
  state.personalityFiles.files

/**
 * Select files for a specific section
 */
export const selectPersonalityFilesBySection = (
  sectionId: PersonalitySectionId
) =>
  createSelector(
    [selectAllPersonalityFiles],
    (files): PersonalityFile[] => files[sectionId]
  )

/**
 * Select a specific personality file by ID and section
 */
export const selectPersonalityFileById = (
  id: string,
  sectionId: PersonalitySectionId
) =>
  createSelector(
    [selectPersonalityFilesBySection(sectionId)],
    (files): PersonalityFile | null => files.find((f) => f.id === id) ?? null
  )

/**
 * Select loading state
 */
export const selectPersonalityFilesLoading = (state: RootState): boolean =>
  state.personalityFiles.loading

/**
 * Select error state
 */
export const selectPersonalityFilesError = (state: RootState): string | null =>
  state.personalityFiles.error

/**
 * Select last saved info (for UI feedback)
 */
export const selectLastSaved = (state: RootState): PersonalityFilesState['lastSaved'] =>
  state.personalityFiles.lastSaved

/**
 * Select total count of personality files across all sections
 */
export const selectTotalPersonalityFilesCount = createSelector(
  [selectAllPersonalityFiles],
  (files): number =>
    Object.values(files).reduce((total, section) => total + section.length, 0)
)

/**
 * Select count of files per section
 */
export const selectPersonalityFilesCountBySection = createSelector(
  [selectAllPersonalityFiles],
  (files): Record<PersonalitySectionId, number> => ({
    'emotional-depth': files['emotional-depth'].length,
    consciousness: files.consciousness.length,
    motivation: files.motivation.length,
    'moral-intuition': files['moral-intuition'].length,
    irrationality: files.irrationality.length,
    growth: files.growth.length,
    'social-identity': files['social-identity'].length,
    creativity: files.creativity.length,
    mortality: files.mortality.length,
    contradiction: files.contradiction.length
  })
)

export default personalityFilesSlice.reducer
