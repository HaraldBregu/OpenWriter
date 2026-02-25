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
}

const initialState: WritingsState = {
  writings: []
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
            blocks: [{ id: nanoid(), content: '' }],
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
    }
  },

  extraReducers: (builder) => {
    /**
     * When output items finish loading, hydrate any 'writings' OutputItems into
     * writingsSlice so they appear in the sidebar after an app restart or workspace open.
     *
     * We match by the action type string to avoid a circular import
     * (writingsSlice → outputSlice → store/index → writingsSlice).
     */
    builder.addMatcher(
      (action): action is PayloadAction<OutputItem[]> =>
        action.type === 'output/loadAll/fulfilled',
      (state, action) => {
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
            // Rebuild blocks only if content actually changed
            const currentContent = existing.blocks.map((b) => b.content).join('\n\n')
            if (currentContent !== item.content) {
              existing.blocks = item.content
                ? item.content
                    .split('\n\n')
                    .filter(Boolean)
                    .map((line): Block => ({ id: crypto.randomUUID(), content: line }))
                : [{ id: crypto.randomUUID(), content: '' }]
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
            blocks: item.content
              ? item.content
                  .split('\n\n')
                  .filter(Boolean)
                  .map((line): Block => ({ id: crypto.randomUUID(), content: line }))
              : [{ id: crypto.randomUUID(), content: '' }],
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
    )
  }
})

export const {
  createWriting,
  addWriting,
  setWritingOutputId,
  updateWritingBlocks,
  updateWritingTitle,
  deleteWriting,
  loadWritings
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

export default writingsSlice.reducer
