import { createAsyncThunk, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './index'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Valid output content types.
 * Mirrors src/shared/types/ipc/types.ts `OutputType` — only 'writings' is
 * supported by the main-process OutputFilesService.
 */
export type OutputType = 'writings'

/**
 * A single content block as stored in Redux.
 * Mirrors the per-block .md file on disk; `name` matches the filename.
 */
export interface OutputBlockItem {
  /** Stable UUID — matches the .md filename (without extension) */
  name: string
  /** Raw markdown content of this block */
  content: string
  createdAt: string  // ISO 8601
  updatedAt: string  // ISO 8601
  /** Block type — 'text' (default), 'heading', or 'media'. */
  blockType?: 'text' | 'heading' | 'media'
  /** Heading level (1–6). Only set when blockType === 'heading'. */
  blockLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Image source (data URL or file path). Only set when blockType === 'media'. */
  mediaSrc?: string
  /** Alt text for the image. Only set when blockType === 'media'. */
  mediaAlt?: string
}

/**
 * Flat, Redux-friendly representation of an output item.
 * The preload bridge returns a nested OutputFile shape (metadata sub-object);
 * we flatten that on the way into the store for ergonomic selector usage.
 *
 * `blocks` is the ordered list of content blocks that replace the old
 * flat `content: string` field.
 */
export interface OutputItem {
  /** Folder name used as the stable identifier (YYYY-MM-DD_HHmmss) */
  id: string
  type: OutputType
  /** Filesystem path (kept for reference / future deep-linking) */
  path: string
  title: string
  /** Ordered list of content blocks (one .md file per block on disk) */
  blocks: OutputBlockItem[]
  category: string
  tags: string[]
  visibility: string
  provider: string
  model: string
  temperature: number
  maxTokens: number | null
  reasoning: boolean
  createdAt: string  // ISO 8601
  updatedAt: string  // ISO 8601
  savedAt: number    // unix timestamp (ms)
}

export interface SaveOutputItemInput {
  type: OutputType
  title: string
  blocks: OutputBlockItem[]
  category?: string
  tags?: string[]
  visibility?: string
  provider?: string
  model?: string
  temperature?: number
  maxTokens?: number | null
  reasoning?: boolean
}

export interface OutputState {
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
 * The bridge now returns `blocks` (ordered array of { name, content, createdAt, updatedAt })
 * instead of the old flat `content: string`.
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
  blocks: Array<{ name: string; content: string; createdAt: string; updatedAt: string }>
  savedAt: number
}): OutputItem {
  return {
    id: file.id,
    type: file.type,
    path: file.path,
    blocks: file.blocks.map((b) => ({
      name: b.name,
      content: b.content,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    })),
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
      const files = await window.workspace.loadOutputs()
      return files.map(mapOutputFileToItem)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load output items'
      return rejectWithValue(message)
    }
  }
)

/**
 * Save a new output item to the workspace.
 * Each block is written to its own .md file; ordering is preserved in config.json.
 * The bridge's outputSave returns { id, path, savedAt }; we construct the
 * full OutputItem directly from that result + the original input.
 */
export const saveOutputItem = createAsyncThunk<OutputItem, SaveOutputItemInput, { rejectValue: string }>(
  'output/save',
  async (input, { rejectWithValue }) => {
    try {
      const {
        blocks,
        type,
        title,
        category,
        tags,
        visibility,
        provider,
        model,
        temperature,
        maxTokens,
        reasoning,
      } = input

      const saved = await window.workspace.saveOutput({
        type,
        blocks: blocks.map((b) => ({
          name: b.name,
          content: b.content,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        })),
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
        blocks,
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

export interface UpdateOutputItemInput extends SaveOutputItemInput {
  id: string
}

/**
 * Update an existing output item in the workspace.
 * Rewrites each block's .md file and updates config.json (preserving createdAt).
 */
export const updateOutputItem = createAsyncThunk<OutputItem, UpdateOutputItemInput, { rejectValue: string }>(
  'output/update',
  async (input, { rejectWithValue }) => {
    try {
      const {
        id,
        type,
        blocks,
        title,
        category,
        tags,
        visibility,
        provider,
        model,
        temperature,
        maxTokens,
        reasoning,
      } = input

      await window.workspace.updateOutput({
        type,
        id,
        blocks: blocks.map((b) => ({
          name: b.name,
          content: b.content,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        })),
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

      return {
        id,
        type,
        path: '',
        blocks,
        savedAt: Date.now(),
        title: title ?? '',
        category: category ?? '',
        tags: tags ?? [],
        visibility: visibility ?? 'private',
        provider: provider ?? 'manual',
        model: model ?? '',
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? null,
        reasoning: reasoning ?? false,
        createdAt: '',   // preserved on disk; not updated in Redux here
        updatedAt: new Date().toISOString()
      } satisfies OutputItem
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update output item'
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
      await window.workspace.deleteOutput(params)
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

    // updateOutputItem
    builder
      .addCase(updateOutputItem.fulfilled, (state, action: PayloadAction<OutputItem>) => {
        const { id, type } = action.payload
        const index = state.items.findIndex((item) => item.id === id && item.type === type)
        if (index !== -1) {
          state.items[index] = {
            ...state.items[index],
            blocks: action.payload.blocks,
            title: action.payload.title,
            category: action.payload.category,
            tags: action.payload.tags,
            visibility: action.payload.visibility,
            provider: action.payload.provider,
            model: action.payload.model,
            temperature: action.payload.temperature,
            maxTokens: action.payload.maxTokens,
            reasoning: action.payload.reasoning,
            updatedAt: action.payload.updatedAt,
          }
        }
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
    writings: 0,
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
