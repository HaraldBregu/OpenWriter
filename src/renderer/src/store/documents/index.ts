/** Documents slice public barrel — re-exports types, state, reducer, and selectors. */
// Types
export type { DocumentItem, DocumentsState } from './types';

// State
export { initialState } from './state';

// Reducer, slice, and synchronous actions
export {
	documentsSlice,
	documentsLoaded,
	documentAdded,
	documentUpdated,
	documentMetadataPatched,
	documentRemoved,
	documentSelected,
	documentsLoadingStarted,
	documentsLoadingFailed,
} from './reducer';
export { default } from './reducer';

// Async actions
export { loadDocuments, refreshDocument } from './actions';

// Selectors
export {
	selectAllDocuments,
	selectSelectedDocument,
	selectSelectedDocumentId,
	selectDocumentsStatus,
	selectDocumentsError,
	selectDocumentById,
} from './selectors';
