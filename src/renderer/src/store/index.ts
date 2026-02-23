import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'
import chatReducer from './chatSlice'
import postsReducer from './postsSlice'
import directoriesReducer from './directoriesSlice'
import personalityFilesReducer from './personalityFilesSlice'
import outputReducer from './outputSlice'
import { postsSyncMiddleware } from './middleware/postsSync.middleware'

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    posts: postsReducer,
    directories: directoriesReducer,
    personalityFiles: personalityFilesReducer,
    output: outputReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(postsSyncMiddleware)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks — use these throughout the app instead of plain useDispatch/useSelector
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
