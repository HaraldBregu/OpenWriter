import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'
import chatReducer from './chatSlice'
import workspaceReducer from './workspaceSlice'
import postsReducer from './postsSlice'
import writingsReducer from './writingsSlice'
import directoriesReducer from './directoriesSlice'
import personalityFilesReducer from './personalityFilesSlice'
import outputReducer from './outputSlice'
import aiSettingsReducer from './aiSettingsSlice'
import { listenerMiddleware } from './listenerMiddleware'
import { registerPostsHydration } from './postsHydration'
import { registerWritingsHydration } from './writingsHydration'

// Register hydration listeners before the store is created.
// These replace the extraReducers string-matching pattern in postsSlice and
// writingsSlice, eliminating the circular import via outputSlice.
registerPostsHydration()
registerWritingsHydration()

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    posts: postsReducer,
    writings: writingsReducer,
    directories: directoriesReducer,
    personalityFiles: personalityFilesReducer,
    output: outputReducer,
    aiSettings: aiSettingsReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks — use these throughout the app instead of plain useDispatch/useSelector
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
