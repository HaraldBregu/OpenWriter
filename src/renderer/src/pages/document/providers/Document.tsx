import React, { createContext, useReducer, useMemo, useContext, useState, useCallback, type Dispatch, type ReactNode } from 'react';
import { documentReducer } from '../context/reducer';
import { INITIAL_DOCUMENT_STATE, type DocumentState } from '../context/state';
import type { DocumentAction } from '../context/actions';
import type { Editor } from '@tiptap/core';

export type ActiveSidebar = 'config' | 'agentic' | 'editor' | null;

interface DocumentContextValue {
	state: DocumentState;
	dispatch: Dispatch<DocumentAction>;
	editor: Editor | null;
	setEditor: (editor: Editor | null) => void;
	activeSidebar: ActiveSidebar;
	animate: boolean;
	setActiveSidebar: (sidebar: ActiveSidebar) => void;
	toggleSidebar: (sidebar: Exclude<ActiveSidebar, null>) => void;
}

const DocumentContext = createContext<DocumentContextValue | null>(null);

export function useDocumentContext(): DocumentContextValue {
	const ctx = useContext(DocumentContext);
	if (!ctx) {
		throw new Error('useDocumentContext must be used within a DocumentProvider');
	}
	return ctx;
}

export function useEditorInstance(): Pick<DocumentContextValue, 'editor' | 'setEditor'> {
	const { editor, setEditor } = useDocumentContext();
	return { editor, setEditor };
}

export function useSidebarVisibility(): Pick<DocumentContextValue, 'activeSidebar' | 'animate' | 'setActiveSidebar' | 'toggleSidebar'> {
	const { activeSidebar, animate, setActiveSidebar, toggleSidebar } = useDocumentContext();
	return { activeSidebar, animate, setActiveSidebar, toggleSidebar };
}

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

	const [editor, setEditorState] = useState<Editor | null>(null);
	const setEditor = useCallback((ed: Editor | null) => {
		setEditorState(ed);
	}, []);

	const [activeSidebar, setActiveSidebar] = useState<ActiveSidebar>('agentic');
	const [animate, setAnimate] = useState(true);

	const toggleSidebar = useCallback((sidebar: Exclude<ActiveSidebar, null>) => {
		setActiveSidebar((prev) => {
			const isSwitching = prev !== null && prev !== sidebar;
			setAnimate(!isSwitching);
			return prev === sidebar ? null : sidebar;
		});
	}, []);

	const value = useMemo<DocumentContextValue>(() => ({
		state,
		dispatch,
		editor,
		setEditor,
		activeSidebar,
		animate,
		setActiveSidebar,
		toggleSidebar,
	}), [state, dispatch, editor, setEditor, activeSidebar, animate, setActiveSidebar, toggleSidebar]);

	return (
		<DocumentContext.Provider value={value}>
			{children}
		</DocumentContext.Provider>
	);
}
