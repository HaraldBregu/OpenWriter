import type { TypedUseSelectorHook } from 'react-redux';
import './workspace/listeners';
export declare const store: import("@reduxjs/toolkit").EnhancedStore<{
    workspace: import("./workspace").WorkspaceState;
}, import("redux").UnknownAction, import("@reduxjs/toolkit").Tuple<[import("redux").StoreEnhancer<{
    dispatch: ((action: import("redux").Action<"listenerMiddleware/add">) => import("@reduxjs/toolkit").UnsubscribeListener) & import("redux-thunk").ThunkDispatch<{
        workspace: import("./workspace").WorkspaceState;
    }, undefined, import("redux").UnknownAction>;
}>, import("redux").StoreEnhancer]>>;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export declare const useAppDispatch: () => AppDispatch;
export declare const useAppSelector: TypedUseSelectorHook<RootState>;
