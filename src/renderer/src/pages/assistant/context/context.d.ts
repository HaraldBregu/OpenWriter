import { type Dispatch } from 'react';
import type { AssistantState } from './state';
import type { AssistantAction } from './actions';
export interface ContextValue {
    state: AssistantState;
    dispatch: Dispatch<AssistantAction>;
}
export declare const AssistantContext: import("react").Context<ContextValue | null>;
