import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './index'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnhancementState {
  /**
   * Block IDs that are currently being enhanced.
   * Stored as an array so it is serialisable by Redux Toolkit's Immer engine.
   */
  enhancingBlockIds: string[]
  /**
   * Accumulated stream content keyed by blockId.
   * Written on every stream token; cleared when the task reaches a terminal state.
   */
  streamingEntries: Record<string, string>
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: EnhancementState = {
  enhancingBlockIds: [],
  streamingEntries: {},
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const enhancementSlice = createSlice({
  name: 'enhancement',
  initialState,
  reducers: {
    /**
     * Mark a block as currently being enhanced.
     * No-ops if the blockId is already present to avoid duplicates.
     */
    markEnhancing(state, action: PayloadAction<string>) {
      const blockId = action.payload
      if (!state.enhancingBlockIds.includes(blockId)) {
        state.enhancingBlockIds.push(blockId)
      }
    },

    /**
     * Upsert the accumulated streaming content for a block.
     * Called on every stream token received from the task manager.
     */
    updateStreamingEntry(state, action: PayloadAction<{ blockId: string; content: string }>) {
      const { blockId, content } = action.payload
      state.streamingEntries[blockId] = content
    },

    /**
     * Remove a block from both `enhancingBlockIds` and `streamingEntries`.
     * Called when the task reaches a terminal state (completed / error / cancelled).
     */
    clearEnhancingBlock(state, action: PayloadAction<string>) {
      const blockId = action.payload
      state.enhancingBlockIds = state.enhancingBlockIds.filter((id) => id !== blockId)
      delete state.streamingEntries[blockId]
    },
  },
})

export const { markEnhancing, updateStreamingEntry, clearEnhancingBlock } =
  enhancementSlice.actions

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const selectEnhancementState = (state: RootState): EnhancementState => state.enhancement

/**
 * Returns the raw string[] of enhancing block IDs.
 * Consumers that need a Set should convert with useMemo.
 */
export const selectEnhancingBlockIds = createSelector(
  [selectEnhancementState],
  (s): string[] => s.enhancingBlockIds,
)

/**
 * Returns the streaming entries record.
 * Consumers that need a Map should convert with useMemo.
 */
export const selectStreamingEntries = createSelector(
  [selectEnhancementState],
  (s): Record<string, string> => s.streamingEntries,
)

export default enhancementSlice.reducer
