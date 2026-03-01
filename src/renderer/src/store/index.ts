import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'
import workspaceReducer from './workspaceSlice'
import outputReducer from './outputSlice'
import aiSettingsReducer from './aiSettingsSlice'
import writingItemsReducer from './writingItemsSlice'
import tasksReducer from './tasksSlice'
import { listenerMiddleware } from './listenerMiddleware'
import { setupTaskIpcListener } from './taskListenerMiddleware'

export const store = configureStore({
  reducer: {
    workspace: workspaceReducer,
    output: outputReducer,
    aiSettings: aiSettingsReducer,
    writingItems: writingItemsReducer,
    tasks: tasksReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware)
})

// Wire up the IPC → Redux bridge for task events.
// This replaces ensureTaskStoreListening() from the former taskStore.ts singleton.
setupTaskIpcListener(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks — use these throughout the app instead of plain useDispatch/useSelector
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
