import React, { useReducer, useMemo, type ReactNode } from 'react';
import { assistantReducer } from './context/reducer';
import { INITIAL_ASSISTANT_STATE } from './context/state';
import { AssistantContext, type ContextValue } from './context/context';

interface ProviderProps {
	readonly children: ReactNode;
}

export function Provider({ children }: ProviderProps): React.JSX.Element {
	const [state, dispatch] = useReducer(assistantReducer, INITIAL_ASSISTANT_STATE);

	const value = useMemo<ContextValue>(() => ({ state, dispatch }), [state, dispatch]);

	return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
