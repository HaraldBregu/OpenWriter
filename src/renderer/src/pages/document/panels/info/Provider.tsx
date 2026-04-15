import React, { useReducer, type ReactNode } from 'react';
import { InfoDispatchContext, InfoStateContext } from './context/contexts';
import { infoReducer } from './context/reducer';
import { INITIAL_INFO_STATE } from './context/state';

interface InfoProviderProps {
	readonly children: ReactNode;
}

export function InfoProvider({ children }: InfoProviderProps): React.JSX.Element {
	const [state, dispatch] = useReducer(infoReducer, INITIAL_INFO_STATE);

	return (
		<InfoStateContext.Provider value={state}>
			<InfoDispatchContext.Provider value={dispatch}>{children}</InfoDispatchContext.Provider>
		</InfoStateContext.Provider>
	);
}
