import { createContext, type Dispatch } from 'react';
import type { PageState } from './state';
import type { PageAction } from './actions';

export interface ContextValue {
	state: PageState;
	dispatch: Dispatch<PageAction>;
}

export const PageContext = createContext<ContextValue | null>(null);
