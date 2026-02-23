import { createAsyncThunk, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './index'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OutputType = 'posts' | 'writings' | 'notes' | 'messages'

/**
 * Flat, Redux-friendly representation of an output item.
 * The preload bridge returns a nested OutputFile shape (metadata sub-object);
 * we flatten that on the way into the store for ergonomic selector usage.
 */
export interface OutputItem {
  /** Folder name used as the stable identifier (YYYY-MM-DD_HHmmss) */
  id: string
  type: OutputType
  /** Filesystem path (kept for reference / future deep-linking) */
  path: string
  title: string
  /** Markdown content stored in DATA.md */
  content: string
  category: string
  tags: string[]
  visibility: string
  provider: string
  model: string
  temperature: number
  maxTokens: number | null
  reasoning: boolean
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  savedAt: number   // unix timestamp (ms)
}

export interface SaveOutputItemInput {
  type: OutputType
  title: string
  content: string
  category?: string
  tags?: string[]
  visibility?: string
  provider?: string
  model?: string
  temperature?: number
  maxTokens?: number | null
  reasoning?: boolean
}

interface OutputState {
  items: OutputItem[]
  loading: boolean
  error: string | null
}

const initialState: OutputState = {
  items: [],
  loading: false,
  error: null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map the preload bridge's nested OutputFile shape to our flat OutputItem.
 * Using unknown + type assertion because window.api types live in the preload
 * declaration file and may not be imported here.
 */
function mapOutputFileToItem(file: {
  id: string
  type: OutputType
  path: string
  metadata: {
    title: string
    type: OutputType
    category: string
    tags: string[]
    visibility: string
    provider: string
    model: string
    temperature?: number
    maxTokens?: number | null
    reasoning?: boolean
    createdAt: string
    updatedAt: string
  }
  content: string
  savedAt: number
}): OutputItem {
  return {
    id: file.id,
    type: file.type,
    path: file.path,
    content: file.content,
    savedAt: file.savedAt,
    title: file.metadata.title,
    category: file.metadata.category,
    tags: file.metadata.tags,
    visibility: file.metadata.visibility,
    provider: file.metadata.provider,
    model: file.metadata.model,
    temperature: file.metadata.temperature ?? 0.7,
    maxTokens: file.metadata.maxTokens ?? null,
    reasoning: file.metadata.reasoning ?? false,
    createdAt: file.metadata.createdAt,
    updatedAt: file.metadata.updatedAt
  }
}

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

/**
 * Load all output items from the workspace via the preload bridge.
 * Maps the nested OutputFile shape to the flat OutputItem shape.
 */
export const loadOutputItems = createAsyncThunk<OutputItem[], void, { rejectValue: string }>(
  'output/loadAll',
  async (_, { rejectWithValue }) => {
    try {
      const files = await window.api.outputLoadAll()
      return files.map(mapOutputFileToItem)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load output items'
      return rejectWithValue(message)
    }
  }
)

/**
 * Save a new output item to the workspace.
 * The bridge's outputSave returns { id, path, savedAt }; we construct the
 * full OutputItem directly from that result + the original input, avoiding
 * a fragile follow-up outputLoadOne call that can race with the file write.
 */
export const saveOutputItem = createAsyncThunk<OutputItem, SaveOutputItemInput, { rejectValue: string }>(
  'output/save',
  async (input, { rejectWithValue }) => {
    try {
      const { content, type, title, category, tags, visibility, provider, model, temperature, maxTokens, reasoning } = input

      const saved = await window.api.outputSave({
        type,
        content,
        metadata: {
          title: title ?? '',
          category: category ?? '',
          tags: tags ?? [],
          visibility: visibility ?? 'private',
          provider: provider ?? 'manual',
          model: model ?? '',
          temperature: temperature ?? 0.7,
          maxTokens: maxTokens ?? null,
          reasoning: reasoning ?? false
        }
      })

      const now = new Date(saved.savedAt).toISOString()
      const item: OutputItem = {
        id: saved.id,
        type,
        path: saved.path,
        content,
        savedAt: saved.savedAt,
        title: title ?? '',
        category: category ?? '',
        tags: tags ?? [],
        visibility: visibility ?? 'private',
        provider: provider ?? 'manual',
        model: model ?? '',
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? null,
        reasoning: reasoning ?? false,
        createdAt: now,
        updatedAt: now
      }
      return item
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save output item'
      return rejectWithValue(message)
    }
  }
)

/**
 * Delete an output item from the workspace and return the { type, id } pair
 * so the reducer can remove it from state.
 */
export const deleteOutputItem = createAsyncThunk<
  { type: OutputType; id: string },
  { type: OutputType; id: string },
  { rejectValue: string }
>(
  'output/delete',
  async (params, { rejectWithValue }) => {
    try {
      await window.api.outputDelete(params)
      return params
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete output item'
      return rejectWithValue(message)
    }
  }
)

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const outputSlice = createSlice({
  name: 'output',
  initialState,
  reducers: {
    /**
     * Replace the full items array (used after a bulk load).
     */
    setItems(state, action: PayloadAction<OutputItem[]>) {
      state.items = action.payload
    },

    /**
     * Prepend a single item (optimistic add or file-watcher creation).
     */
    addItem(state, action: PayloadAction<OutputItem>) {
      state.items.unshift(action.payload)
    },

    /**
     * Merge partial changes into an existing item matched by id + type.
     */
    updateItem(
      state,
      action: PayloadAction<{
        id: string
        type: OutputType
        changes: Partial<Omit<OutputItem, 'id' | 'type'>>
      }>
    ) {
      const { id, type, changes } = action.payload
      const index = state.items.findIndex((item) => item.id === id && item.type === type)
      if (index === -1) return
      state.items[index] = {
        ...state.items[index],
        ...changes,
        updatedAt: new Date().toISOString()
      }
    },

    /**
     * Remove a single item matched by id + type.
     */
    removeItem(state, action: PayloadAction<{ id: string; type: OutputType }>) {
      const { id, type } = action.payload
      state.items = state.items.filter((item) => !(item.id === id && item.type === type))
    },

    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },

    clearError(state) {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // loadOutputItems
    builder
      .addCase(loadOutputItems.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadOutputItems.fulfilled, (state, action: PayloadAction<OutputItem[]>) => {
        state.loading = false
        // Sort most-recent first by savedAt before storing
        state.items = [...action.payload].sort((a, b) => b.savedAt - a.savedAt)
      })
      .addCase(loadOutputItems.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? 'Unknown error loading output items'
      })

    // saveOutputItem
    builder
      .addCase(saveOutputItem.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(saveOutputItem.fulfilled, (state, action: PayloadAction<OutputItem>) => {
        state.loading = false
        // Prepend so the newest item appears at the top of lists
        state.items.unshift(action.payload)
      })
      .addCase(saveOutputItem.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? 'Unknown error saving output item'
      })

    // deleteOutputItem
    builder
      .addCase(deleteOutputItem.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        deleteOutputItem.fulfilled,
        (state, action: PayloadAction<{ id: string; type: OutputType }>) => {
          state.loading = false
          const { id, type } = action.payload
          state.items = state.items.filter((item) => !(item.id === id && item.type === type))
        }
      )
      .addCase(deleteOutputItem.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? 'Unknown error deleting output item'
      })
  }
})

export const {
  setItems,
  addItem,
  updateItem,
  removeItem,
  setLoading,
  setError,
  clearError
} = outputSlice.actions

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const selectOutputState = (state: RootState): OutputState => state.output

/**
 * Select all output items (most-recent first, maintained by reducers).
 */
export const selectAllOutputItems = createSelector(
  [selectOutputState],
  (output): OutputItem[] => output.items
)

/**
 * Select output items filtered by type.
 * Returns a stable factory selector — call with the desired type.
 */
export const selectOutputItemsByType = (type: OutputType) =>
  createSelector(
    [selectAllOutputItems],
    (items): OutputItem[] => items.filter((item) => item.type === type)
  )

/**
 * Select a single item by type + id. Returns null when not found.
 */
export const selectOutputItemById = (type: OutputType, id: string) =>
  createSelector(
    [selectAllOutputItems],
    (items): OutputItem | null => items.find((item) => item.id === id && item.type === type) ?? null
  )

/**
 * Total count of all output items across all types.
 */
export const selectOutputItemsCount = createSelector(
  [selectAllOutputItems],
  (items): number => items.length
)

/**
 * Count of items broken down by type.
 */
export const selectOutputItemsCountByType = createSelector(
  [selectAllOutputItems],
  (items): Record<OutputType, number> => ({
    posts: 0,
    writings: 0,
    notes: 0,
    messages: 0,
    ...items.reduce<Partial<Record<OutputType, number>>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1
      return acc
    }, {})
  })
)

/**
 * Loading state.
 */
export const selectOutputLoading = (state: RootState): boolean => state.output.loading

/**
 * Error state.
 */
export const selectOutputError = (state: RootState): string | null => state.output.error

export default outputSlice.reducer
