import React, { useReducer, useMemo, useState, useCallback, type ReactNode } from 'react';
import type { Editor } from '@tiptap/core';
import { documentReducer } from './context/reducer';
import { INITIAL_DOCUMENT_STATE } from './context/state';
import { DocumentContext, type ContextValue } from './context/context';

interface ProviderProps {
	readonly children: ReactNode;
	readonly documentId: string | undefined;
}

export function Provider({ children, documentId }: ProviderProps): React.JSX.Element {
	const [state, dispatch] = useReducer(documentReducer, {
		...INITIAL_DOCUMENT_STATE,
		documentId,
	});

	const [editor, setEditorState] = useState<Editor | null>(null);
	const setEditor = useCallback((ed: Editor | null) => {
		setEditorState(ed);
	}, []);

	const value = useMemo<ContextValue>(
		() => ({
			state,
			dispatch,
			editor,
			setEditor,
		}),
		[state, dispatch, editor, setEditor]
	);

	return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}
