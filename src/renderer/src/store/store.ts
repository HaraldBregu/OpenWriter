import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import rootReducer from './rootReducers';
import rootSaga from './rootSaga';

// Crea il middleware saga
const sagaMiddleware = createSagaMiddleware();

// Configura lo store Redux
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
});

// Esegui la root saga
sagaMiddleware.run(rootSaga);

// Tipo dello stato globale
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
