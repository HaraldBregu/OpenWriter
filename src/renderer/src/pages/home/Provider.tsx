import React, { useReducer, useMemo, type ReactNode } from 'react';
import { homeReducer } from './context/reducer';
import { INITIAL_HOME_STATE } from './context/state';
import { HomeContext, type ContextValue } from './context/context';

interface ProviderProps {
	readonly children: ReactNode;
}

export function Provider({ children }: ProviderProps): React.JSX.Element {
	const [state, dispatch] = useReducer(homeReducer, INITIAL_HOME_STATE);
	const value = useMemo<ContextValue>(() => ({ state, dispatch }), [state, dispatch]);

	return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}
