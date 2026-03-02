/** Writings slice — Redux Toolkit slice for writing items state. */
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { initialState } from './state'
import type { WritingItem, WritingsState } from './types'

export type { WritingsState }

export const writingsSlice = createSlice({
  name: 'writings',
  initialState,
  reducers: {
    /** Replace the full list of writing items (e.g. after loading from disk). */
    writingsLoaded(state, action: PayloadAction<WritingItem[]>) {
      state.items = action.payload
      state.status = 'ready'
      state.error = null
    },

    /** Add a new writing item to the list. */
    writingAdded(state, action: PayloadAction<WritingItem>) {
      state.items.push(action.payload)
    },

    /** Update an existing writing item by id. */
    writingUpdated(state, action: PayloadAction<WritingItem>) {
      const index = state.items.findIndex((w) => w.id === action.payload.id)
      if (index !== -1) {
        state.items[index] = action.payload
      }
    },

    /** Remove a writing item by id. */
    writingRemoved(state, action: PayloadAction<string>) {
      state.items = state.items.filter((w) => w.id !== action.payload)
      if (state.selectedId === action.payload) {
        state.selectedId = null
      }
    },

    /** Set the currently selected writing item. */
    writingSelected(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload
    },

    /** Set loading status and clear any previous error. */
    writingsLoadingStarted(state) {
      state.status = 'loading'
      state.error = null
    },

    /** Set error status with a message. */
    writingsLoadingFailed(state, action: PayloadAction<string>) {
      state.status = 'error'
      state.error = action.payload
    },
  },
})

export const {
  writingsLoaded,
  writingAdded,
  writingUpdated,
  writingRemoved,
  writingSelected,
  writingsLoadingStarted,
  writingsLoadingFailed,
} = writingsSlice.actions

export default writingsSlice.reducer
