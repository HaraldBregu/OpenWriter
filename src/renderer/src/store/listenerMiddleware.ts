import { createListenerMiddleware } from '@reduxjs/toolkit'
import type { RootState, AppDispatch } from './index'

/**
 * Shared RTK listener middleware instance.
 *
 * Hydration listeners (postsHydration, writingsHydration) register their
 * effects here instead of using extraReducers with hardcoded action type
 * strings. This breaks the circular import:
 *
 *   postsSlice → outputSlice → store/index → postsSlice
 *
 * The listener files import from both slices independently — store/index
 * imports those files after all slices are defined, keeping the graph acyclic.
 */
export const listenerMiddleware = createListenerMiddleware()

export type AppStartListening = typeof listenerMiddleware.startListening<RootState, AppDispatch>
