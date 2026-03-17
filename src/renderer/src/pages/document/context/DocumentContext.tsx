import React, { createContext, useReducer, useMemo, type Dispatch, type ReactNode } from 'react';
import { documentReducer } from './reducer';
import { INITIAL_DOCUMENT_STATE, type DocumentState } from './state';
import type { DocumentAction } from './actions';

export const DocumentStateContext = createContext<DocumentState | null>(null);
export const DocumentDispatchContext = createContext<Dispatch<DocumentAction> | null>(null);

interface DocumentProviderProps {
	readonly children: ReactNode;
	readonly documentId: string | undefined;
}

export function DocumentProvider({
	children,
	documentId,
}: DocumentProviderProps): React.JSX.Element {
	const [state, dispatch] = useReducer(documentReducer, {
		...INITIAL_DOCUMENT_STATE,
		documentId,
	});

	const stableState = useMemo(() => state, [state]);

	return (
		<DocumentStateContext.Provider value={stableState}>
			<DocumentDispatchContext.Provider value={dispatch}>
				{children}
			</DocumentDispatchContext.Provider>
		</DocumentStateContext.Provider>
	);
}
