/** Documents state selectors. */
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { DocumentItem } from './types';

const selectDocumentsSlice = (state: RootState) => state.documents;

/** All document items as an array. */
export const selectAllDocuments = (state: RootState): DocumentItem[] => state.documents.items;

/** The currently selected document item, or undefined if none. */
export const selectSelectedDocument = createSelector(selectDocumentsSlice, (documents) =>
	documents.items.find((d) => d.id === documents.selectedId)
);

/** The id of the currently selected document. */
export const selectSelectedDocumentId = (state: RootState): string | null =>
	state.documents.selectedId;

/** Documents loading status. */
export const selectDocumentsStatus = (state: RootState) => state.documents.status;

/** Documents error message. */
export const selectDocumentsError = (state: RootState) => state.documents.error;

/** A single document item by id, or undefined. */
export const selectDocumentById = (state: RootState, id: string): DocumentItem | undefined =>
	state.documents.items.find((d) => d.id === id);
