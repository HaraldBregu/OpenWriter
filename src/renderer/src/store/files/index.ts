/** Files slice public barrel — re-exports state, actions, reducer, and selectors. */

// State
export type { FilesState } from './state';
export { initialFilesState } from './state';

// Async thunks
export { loadFiles, removeFiles } from './actions';

// Reducer, slice, and synchronous actions
export {
  filesSlice,
  fileEntryRemoved,
  insertFilesRequested,
  insertFilesCompleted,
  resetFiles,
} from './reducer';
export { default } from './reducer';

// Selectors
export {
  selectFilesState,
  selectFileEntries,
  selectFilesStatus,
  selectFilesError,
  selectFilesIsLoading,
  selectFilesInserting,
} from './selectors';
