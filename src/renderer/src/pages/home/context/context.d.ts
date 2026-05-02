import { type Dispatch } from 'react';
import type { HomeState } from './state';
import type { HomeAction } from './actions';
export interface ContextValue {
    state: HomeState;
    dispatch: Dispatch<HomeAction>;
}
export declare const HomeContext: import("react").Context<ContextValue | null>;
