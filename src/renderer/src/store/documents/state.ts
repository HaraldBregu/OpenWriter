/** Documents slice initial state. */
import type { DocumentsState } from './types';

export type { DocumentsState };

export const initialState: DocumentsState = {
	items: [],
	selectedId: null,
	status: 'idle',
	error: null,
};
