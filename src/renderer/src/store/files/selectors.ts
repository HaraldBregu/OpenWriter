/** Files state selectors. */
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export const selectFilesState = (state: RootState) => state.files;

export const selectFileEntries = createSelector(selectFilesState, (state) => state.entries);

export const selectFilesStatus = createSelector(selectFilesState, (state) => state.status);

export const selectFilesError = createSelector(selectFilesState, (state) => state.error);

export const selectFilesIsLoading = createSelector(
	selectFilesStatus,
	(status) => status === 'idle' || status === 'loading'
);

export const selectFilesInserting = createSelector(selectFilesState, (state) => state.inserting);
