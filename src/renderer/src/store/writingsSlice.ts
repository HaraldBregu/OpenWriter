import { createSelector, createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit'
import type { Block } from '@/components/ContentBlock'
import type { OutputItem } from './outputSlice'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Writing {
  id: string
  title: string
  blocks: Block[]
  category: string
  tags: string[]
  visibility: string
  createdAt: number
  updatedAt: number
  /** ID of the corresponding output folder on disk (set after first save) */
  outputId?: string
  provider?: string
  model?: string
  temperature?: number
  maxTokens?: number | null
  reasoning?: boolean
}

interface WritingsState {
  writings: Writing[]
  /**
   * Error message set when `useCreateWriting` encounters a failure.
   * Cleared by `clearWritingCreationError` or the next successful creation.
   */
  creationError: string | null
}

const initialState: WritingsState = {
  writings: [],
  creationError: null,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a fresh Block with ISO 8601 timestamps.
 */
function makeBlock(content = ''): Block {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), type: 'text', content, createdAt: now, updatedAt: now }
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const writingsSlice = createSlice({
  name: 'writings',
  initialState,
  reducers: {
    createWriting: {
      reducer(state, action: PayloadAction<Writing>) {
        state.writings.unshift(action.payload)
      },
      prepare() {
        return {
          payload: {
            id: nanoid(),
            title: '',
            blocks: [makeBlock()],
            category: 'writing',
            tags: [],
            visibility: 'private',
            createdAt: Date.now(),
            updatedAt: Date.now()
          } satisfies Writing
        }
      }
    },

    addWriting(state, action: PayloadAction<Writing>) {
      state.writings.unshift(action.payload)
    },

    setWritingOutputId(state, action: PayloadAction<{ writingId: string; outputId: string }>) {
      const writing = state.writings.find((w) => w.id === action.payload.writingId)
      if (writing) writing.outputId = action.payload.outputId
    },

    updateWritingBlocks(
      state,
      action: PayloadAction<{ writingId: string; blocks: Block[] }>
    ) {
      const writing = state.writings.find((w) => w.id === action.payload.writingId)
      if (!writing) return
      writing.blocks = action.payload.blocks
      writing.updatedAt = Date.now()
    },

    updateWritingTitle(
      state,
      action: PayloadAction<{ writingId: string; title: string }>
    ) {
      const writing = state.writings.find((w) => w.id === action.payload.writingId)
      if (!writing) return
      writing.title = action.payload.title
      writing.updatedAt = Date.now()
    },

    updateWritingInferenceSettings(
      state,
      action: PayloadAction<{
        writingId: string
        provider: string
        model: string
        temperature: number
        maxTokens: number | null
        reasoning: boolean
      }>
    ) {
      const writing = state.writings.find((w) => w.id === action.payload.writingId)
      if (!writing) return
      writing.provider = action.payload.provider
      writing.model = action.payload.model
      writing.temperature = action.payload.temperature
      writing.maxTokens = action.payload.maxTokens
      writing.reasoning = action.payload.reasoning
      writing.updatedAt = Date.now()
    },

    deleteWriting(state, action: PayloadAction<string>) {
      state.writings = state.writings.filter((w) => w.id !== action.payload)
    },

    loadWritings(state, action: PayloadAction<Writing[]>) {
      state.writings = action.payload
    },

    /**
     * Record a writing creation error (set by useCreateWriting on failure).
     * Stored here so any component in the tree can surface it if needed.
     */
    setWritingCreationError(state, action: PayloadAction<string>) {
      state.creationError = action.payload
    },

    /** Clear the creation error, e.g. when the user dismisses a toast. */
    clearWritingCreationError(state) {
      state.creationError = null
    },

    /**
     * Hydrate writings from disk after outputSlice finishes loading.
     *
     * Previously this lived in extraReducers matching 'output/loadAll/fulfilled'
     * by string. Now writingsHydration.ts registers an RTK listener for
     * loadOutputItems.fulfilled and dispatches this action, keeping the import
     * graph acyclic while preserving type safety.
     */
    hydrateWritingsFromDisk(state, action: PayloadAction<OutputItem[]>) {
      const diskWritings = action.payload.filter((item) => item.type === 'writings')
      const diskOutputIds = new Set(diskWritings.map((item) => item.id))

      // 1. Remove writings whose output folder no longer exists on disk
      state.writings = state.writings.filter(
        (w) => !w.outputId || diskOutputIds.has(w.outputId)
      )

      // 2. Update writings whose disk content/title changed
      for (const item of diskWritings) {
        const existing = state.writings.find((w) => w.outputId === item.id)
        if (existing) {
          existing.title = item.title
          existing.category = item.category
          existing.tags = item.tags
          existing.visibility = item.visibility
          existing.provider = item.provider
          existing.model = item.model
          existing.temperature = item.temperature
          existing.maxTokens = item.maxTokens
          existing.reasoning = item.reasoning
          existing.updatedAt = new Date(item.updatedAt).getTime()

          // Rebuild blocks only if content actually changed.
          const diskFingerprint = item.blocks.map((b) => `${b.name}:${b.content}`).join('|')
          const currentFingerprint = existing.blocks.map((b) => `${b.id}:${b.content}`).join('|')
          if (diskFingerprint !== currentFingerprint) {
            existing.blocks = item.blocks.length > 0
              ? item.blocks.map((b): Block => ({
                  id: b.name,
                  content: b.content,
                  createdAt: b.createdAt,
                  updatedAt: b.updatedAt,
                }))
              : [makeBlock()]
          }
        }
      }

      // 3. Add writings that don't exist in Redux yet
      const existingOutputIds = new Set(
        state.writings.map((w) => w.outputId).filter(Boolean) as string[]
      )
      const newWritings: Writing[] = diskWritings
        .filter((item) => !existingOutputIds.has(item.id))
        .map((item): Writing => ({
          id: crypto.randomUUID(),
          title: item.title,
          blocks: item.blocks.length > 0
            ? item.blocks.map((b): Block => ({
                id: b.name,
                content: b.content,
                createdAt: b.createdAt,
                updatedAt: b.updatedAt,
              }))
            : [makeBlock()],
          category: item.category,
          tags: item.tags,
          visibility: item.visibility,
          provider: item.provider,
          model: item.model,
          temperature: item.temperature,
          maxTokens: item.maxTokens,
          reasoning: item.reasoning,
          createdAt: new Date(item.createdAt).getTime(),
          updatedAt: new Date(item.updatedAt).getTime(),
          outputId: item.id
        }))

      if (newWritings.length > 0) {
        state.writings.push(...newWritings)
      }
    }
  }
})

export const {
  createWriting,
  addWriting,
  setWritingOutputId,
  updateWritingBlocks,
  updateWritingTitle,
  updateWritingInferenceSettings,
  deleteWriting,
  loadWritings,
  hydrateWritingsFromDisk,
  setWritingCreationError,
  clearWritingCreationError,
} = writingsSlice.actions

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectWritings = (state: { writings: WritingsState }): Writing[] =>
  state.writings.writings

export const selectWritingById = (id: string) =>
  createSelector([selectWritings], (writings) => writings.find((w) => w.id === id) ?? null)

export const selectWritingCount = createSelector(
  [selectWritings],
  (writings): number => writings.length
)

export const selectWritingCreationError = (state: { writings: WritingsState }): string | null =>
  state.writings.creationError

export default writingsSlice.reducer
