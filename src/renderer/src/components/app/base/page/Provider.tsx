import React, { memo, useMemo, useReducer, type ReactNode } from 'react';
import { PageContext, type ContextValue } from './context/context';
import { pageReducer } from './context/reducer';
import { INITIAL_PAGE_STATE, type PageState } from './context/state';

interface ProviderProps {
	readonly children: ReactNode;
	readonly initialState?: Partial<PageState>;
}

export const Provider = memo(function Provider({
	children,
	initialState,
}: ProviderProps): React.ReactElement {
	const [state, dispatch] = useReducer(pageReducer, {
		...INITIAL_PAGE_STATE,
		...initialState,
	});
	const value = useMemo<ContextValue>(() => ({ state, dispatch }), [state]);
	return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
});
