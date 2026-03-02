/** Writings slice synchronous actions — re-exported from the reducer for convenient named imports. */
export {
  writingsLoaded,
  writingAdded,
  writingUpdated,
  writingRemoved,
  writingSelected,
  writingsLoadingStarted,
  writingsLoadingFailed,
} from './reducer'

import { createAsyncThunk } from '@reduxjs/toolkit'
import type { AppDispatch } from '../index'
import type { WritingItem } from './types'
import { writingsLoadingStarted, writingsLoaded, writingsLoadingFailed, writingUpdated } from './reducer'

function toWritingItem(f: {
  id: string
  path: string
  metadata: { title?: string }
  savedAt: number
}): WritingItem {
  return {
    id: f.id,
    title: (f.metadata.title as string) || '',
    path: f.path,
    createdAt: f.savedAt,
    updatedAt: f.savedAt,
  }
}

export const loadWritings = createAsyncThunk<void, void, { dispatch: AppDispatch }>(
  'writings/load',
  async (_, { dispatch }) => {
    dispatch(writingsLoadingStarted())
    try {
      const files = await window.workspace.loadOutputsByType('writings')
      dispatch(writingsLoaded(files.map(toWritingItem)))
    } catch (err) {
      dispatch(writingsLoadingFailed(err instanceof Error ? err.message : String(err)))
    }
  }
)

export const refreshWriting = createAsyncThunk<void, string, { dispatch: AppDispatch }>(
  'writings/refresh',
  async (id, { dispatch }) => {
    try {
      const file = await window.workspace.loadOutput({ type: 'writings', id })
      if (file) dispatch(writingUpdated(toWritingItem(file)))
    } catch {
      // silently ignore — stale state is acceptable for a single refresh
    }
  }
)
