/** Redux store configuration, root types, and typed dispatch/selector hooks. */
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import workspaceReducer from './workspace/reducer';
import { listenerMiddleware } from './listener-middleware';
// Side-effect imports: register listener effects
import './workspace/listeners';
export const store = configureStore({
    reducer: {
        workspace: workspaceReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});
// Typed hooks — use these throughout the app instead of plain useDispatch/useSelector
export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;
