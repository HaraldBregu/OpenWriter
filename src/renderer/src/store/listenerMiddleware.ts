import { createListenerMiddleware, addListener } from '@reduxjs/toolkit'
import type { TypedAddListener, TypedStartListening } from '@reduxjs/toolkit'

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
 * imports those listener files after all slices are defined, keeping the
 * module graph acyclic.
 *
 * Types are inferred from the registered listeners; consumers that need
 * RootState/AppDispatch generics can cast via the typed helpers exported
 * from store/index.ts.
 */
export const listenerMiddleware = createListenerMiddleware()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppStartListening = TypedStartListening<any, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppAddListener = TypedAddListener<any, any>

export const startAppListening =
  listenerMiddleware.startListening as AppStartListening

export const addAppListener = addListener as AppAddListener
