/** Redux store configuration, root types, and typed dispatch/selector hooks. */
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import workspaceReducer from './workspace/reducer';
import documentsReducer from './documents/reducer';
import { listenerMiddleware } from './listener-middleware';

// Side-effect imports: register listener effects
import './workspace/listeners';

export const store = configureStore({
	reducer: {
		workspace: workspaceReducer,
		documents: documentsReducer,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks — use these throughout the app instead of plain useDispatch/useSelector
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
