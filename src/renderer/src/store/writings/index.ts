/** Writings slice public barrel — re-exports types, state, reducer, and selectors. */
// Types
export type { WritingItem, WritingsState } from './types'

// State
export { initialState } from './state'

// Reducer, slice, and synchronous actions
export {
  writingsSlice,
  writingsLoaded,
  writingAdded,
  writingUpdated,
  writingRemoved,
  writingSelected,
  writingsLoadingStarted,
  writingsLoadingFailed,
} from './reducer'
export { default } from './reducer'

// Selectors
export {
  selectAllWritings,
  selectSelectedWriting,
  selectSelectedWritingId,
  selectWritingsStatus,
  selectWritingsError,
  selectWritingById,
} from './selectors'
