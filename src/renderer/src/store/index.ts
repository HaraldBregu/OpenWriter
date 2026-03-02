import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'
import workspaceReducer from './workspace/workspaceSlice'
import tasksReducer from './tasks/tasksSlice'
import { listenerMiddleware } from './listenerMiddleware'

export const store = configureStore({
  reducer: {
    workspace: workspaceReducer,
    tasks: tasksReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks — use these throughout the app instead of plain useDispatch/useSelector
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
