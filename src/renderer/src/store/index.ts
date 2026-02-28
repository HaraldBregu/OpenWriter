import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'
import workspaceReducer from './workspaceSlice'
import directoriesReducer from './directoriesSlice'
import personalityFilesReducer from './personalityFilesSlice'
import outputReducer from './outputSlice'
import aiSettingsReducer from './aiSettingsSlice'
import writingItemsReducer from './writingItemsSlice'
import { listenerMiddleware } from './listenerMiddleware'

export const store = configureStore({
  reducer: {
    workspace: workspaceReducer,
    directories: directoriesReducer,
    personalityFiles: personalityFilesReducer,
    output: outputReducer,
    aiSettings: aiSettingsReducer,
    writingItems: writingItemsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks — use these throughout the app instead of plain useDispatch/useSelector
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
