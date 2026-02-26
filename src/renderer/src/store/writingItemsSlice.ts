import { createAsyncThunk, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { WritingItem } from '../../../shared/types/ipc/types'
import type { RootState } from './index'
import type { Block } from '@/components/ContentBlock'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Redux-friendly representation of a writing item loaded from disk.
 *
 * The disk format (WritingItemsService) stores content as a single `content.md`
 * file. The editor renders `Block[]` internally, so content is stored as one
 * block per writing item: the full markdown text lives in `blocks[0].content`.
 *
 * `writingItemId` is the stable on-disk folder name (YYYY-MM-DD_HHmmss) and is
 * used whenever calling `window.writingItems.*`. It is distinct from `id`,
 * which is a client-side UUID used for React routing and Redux keying.
 */
export interface WritingEntry {
  /** Client-side UUID — used for routing (/new/writing/:id) and Redux keying. */
  id: string
  /** Stable on-disk folder name (YYYY-MM-DD_HHmmss). Null for unsaved drafts. */
  writingItemId: string | null
  title: string
  blocks: Block[]
  category: string
  tags: string[]
  /** ISO 8601 */
  createdAt: string
  /** ISO 8601 */
  updatedAt: string
  /** Unix ms — used for sort-by-recency */
  savedAt: number
}

interface WritingItemsState {
  entries: WritingEntry[]
  status: 'idle' | 'loading' | 'loaded' | 'error'
  error: string | null
  /** Set when creating a writing item fails */
  creationError: string | null
}

const initialState: WritingItemsState = {
  entries: [],
  status: 'idle',
  error: null,
  creationError: null,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBlock(content = ''): Block {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), content, createdAt: now, updatedAt: now }
}

/**
 * Map a WritingItem from the IPC bridge to a WritingEntry for Redux.
 * The disk content string becomes the first (and only) block.
 */
function mapWritingItemToEntry(item: WritingItem): WritingEntry {
  const block = makeBlock(item.content)
  // Preserve the original block timestamps from the file mtime via savedAt
  const ts = new Date(item.savedAt).toISOString()
  block.createdAt = item.metadata.createdAt || ts
  block.updatedAt = item.metadata.updatedAt || ts

  return {
    id: crypto.randomUUID(),
    writingItemId: item.id,
    title: item.metadata.title,
    blocks: [block],
    category: item.metadata.category,
    tags: item.metadata.tags,
    createdAt: item.metadata.createdAt,
    updatedAt: item.metadata.updatedAt,
    savedAt: item.savedAt,
  }
}

// ---------------------------------------------------------------------------
// Async thunks
// ---------------------------------------------------------------------------

/**
 * Load all writing items from the current workspace via window.writingItems.loadAll.
 * Returns an empty array when no workspace is active (the service handles that).
 */
export const loadWritingItems = createAsyncThunk<WritingEntry[], void, { rejectValue: string }>(
  'writingItems/loadAll',
  async (_, { rejectWithValue }) => {
    try {
      const items = await window.writingItems.loadAll()
      return items.map(mapWritingItemToEntry)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load writing items'
      return rejectWithValue(message)
    }
  }
)

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const writingItemsSlice = createSlice({
  name: 'writingItems',
  initialState,
  reducers: {
    /**
     * Add a writing entry immediately after a successful disk creation.
     * Called by useCreateWriting after window.writingItems.create succeeds.
     */
    addEntry(state, action: PayloadAction<WritingEntry>) {
      state.entries.unshift(action.payload)
      state.creationError = null
    },

    /**
     * Update the writingItemId on a draft entry once it has been saved to disk.
     */
    setWritingItemId(
      state,
      action: PayloadAction<{ entryId: string; writingItemId: string }>
    ) {
      const entry = state.entries.find((e) => e.id === action.payload.entryId)
      if (entry) {
        entry.writingItemId = action.payload.writingItemId
      }
    },

    /**
     * Replace the blocks of an existing entry (used by useDraftEditor on edit).
     */
    updateEntryBlocks(
      state,
      action: PayloadAction<{ entryId: string; blocks: Block[] }>
    ) {
      const entry = state.entries.find((e) => e.id === action.payload.entryId)
      if (!entry) return
      entry.blocks = action.payload.blocks
      entry.updatedAt = new Date().toISOString()
      entry.savedAt = Date.now()
    },

    /**
     * Update only the title of an entry.
     */
    updateEntryTitle(state, action: PayloadAction<{ entryId: string; title: string }>) {
      const entry = state.entries.find((e) => e.id === action.payload.entryId)
      if (!entry) return
      entry.title = action.payload.title
      entry.updatedAt = new Date().toISOString()
      entry.savedAt = Date.now()
    },

    /**
     * Remove a single entry by its client-side id.
     */
    removeEntry(state, action: PayloadAction<string>) {
      state.entries = state.entries.filter((e) => e.id !== action.payload)
    },

    setCreationError(state, action: PayloadAction<string>) {
      state.creationError = action.payload
    },

    clearCreationError(state) {
      state.creationError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadWritingItems.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadWritingItems.fulfilled, (state, action) => {
        state.status = 'loaded'
        // Merge: preserve entries that exist only in Redux (unsaved drafts without
        // a writingItemId) and replace everything else with the fresh disk data.
        const diskIds = new Set(action.payload.map((e) => e.writingItemId))
        const draftOnlyEntries = state.entries.filter(
          (e) => e.writingItemId === null || !diskIds.has(e.writingItemId)
        )
        // For matching entries, prefer disk data but preserve the existing
        // client-side `id` so React Router links remain stable.
        const diskEntries = action.payload.map((diskEntry) => {
          const existing = state.entries.find(
            (e) => e.writingItemId === diskEntry.writingItemId
          )
          if (existing) {
            return { ...diskEntry, id: existing.id }
          }
          return diskEntry
        })
        state.entries = [...diskEntries, ...draftOnlyEntries].sort(
          (a, b) => b.savedAt - a.savedAt
        )
      })
      .addCase(loadWritingItems.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload ?? 'Unknown error loading writing items'
      })
  },
})

export const {
  addEntry,
  setWritingItemId,
  updateEntryBlocks,
  updateEntryTitle,
  removeEntry,
  setCreationError,
  clearCreationError,
} = writingItemsSlice.actions

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const selectWritingItemsState = (state: RootState): WritingItemsState => state.writingItems

export const selectWritingEntries = createSelector(
  [selectWritingItemsState],
  (s): WritingEntry[] => s.entries
)

export const selectWritingEntryById = (id: string) =>
  createSelector([selectWritingEntries], (entries): WritingEntry | null =>
    entries.find((e) => e.id === id) ?? null
  )

export const selectWritingItemsStatus = (state: RootState) => state.writingItems.status
export const selectWritingItemsError = (state: RootState) => state.writingItems.error
export const selectWritingCreationError = (state: RootState) => state.writingItems.creationError

export default writingItemsSlice.reducer
