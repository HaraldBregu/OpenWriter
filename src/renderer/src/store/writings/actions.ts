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
import { writingsLoadingStarted, writingsLoaded, writingsLoadingFailed } from './reducer'

export const loadWritings = createAsyncThunk<void, void, { dispatch: AppDispatch }>(
  'writings/load',
  async (_, { dispatch }) => {
    dispatch(writingsLoadingStarted())
    try {
      const files = await window.workspace.loadOutputsByType('writings')
      const items: WritingItem[] = files.map((f) => ({
        id: f.id,
        title: (f.metadata.title as string) || '',
        path: f.path,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      }))
      dispatch(writingsLoaded(items))
    } catch (err) {
      dispatch(writingsLoadingFailed(err instanceof Error ? err.message : String(err)))
    }
  }
)
