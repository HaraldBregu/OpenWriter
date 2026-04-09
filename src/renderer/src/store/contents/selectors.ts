/** Contents state selectors. */
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export const selectContentsState = (state: RootState) => state.contents;

export const selectContentEntries = createSelector(selectContentsState, (state) => state.entries);

export const selectContentsStatus = createSelector(selectContentsState, (state) => state.status);

export const selectContentsError = createSelector(selectContentsState, (state) => state.error);

export const selectContentsIsLoading = createSelector(
	selectContentsStatus,
	(status) => status === 'idle' || status === 'loading'
);

export const selectContentsInserting = createSelector(
	selectContentsState,
	(state) => state.inserting
);
