/** Writings slice initial state. */
import type { WritingsState } from './types';

export type { WritingsState };

export const initialState: WritingsState = {
  items: [],
  selectedId: null,
  status: 'idle',
  error: null,
};
