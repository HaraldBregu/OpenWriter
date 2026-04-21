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

	const [insertContentDialogOpen, setInsertContentDialogOpen] = useState(false);
	const openInsertContentDialog = useCallback(() => setInsertContentDialogOpen(true), []);
	const closeInsertContentDialog = useCallback(() => setInsertContentDialogOpen(false), []);

	const value = useMemo<ContextValue>(
		() => ({
			state,
			dispatch,
			editor,
			setEditor,
			insertContentDialogOpen,
			openInsertContentDialog,
			closeInsertContentDialog,
		}),
		[
			state,
			dispatch,
			editor,
			setEditor,
			insertContentDialogOpen,
			openInsertContentDialog,
			closeInsertContentDialog,
		]
	);

	return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}
