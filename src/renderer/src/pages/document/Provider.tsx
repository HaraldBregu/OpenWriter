import React, { createContext, useReducer, useMemo, useContext as useReactContext, useState, useCallback, type Dispatch, type ReactNode } from 'react';
import { documentReducer } from './context/reducer';
import { INITIAL_DOCUMENT_STATE, type DocumentState } from './context/state';
import type { DocumentAction } from './context/actions';
import type { Editor } from '@tiptap/core';

export type ActiveSidebar = 'config' | 'agentic' | 'editor' | null;

interface ContextValue {
	state: DocumentState;
	dispatch: Dispatch<DocumentAction>;
	editor: Editor | null;
	setEditor: (editor: Editor | null) => void;
	activeSidebar: ActiveSidebar;
	animate: boolean;
	setActiveSidebar: (sidebar: ActiveSidebar) => void;
	toggleSidebar: (sidebar: Exclude<ActiveSidebar, null>) => void;
}

const Context = createContext<ContextValue | null>(null);

export function useContext(): ContextValue {
	const ctx = useReactContext(Context);
	if (!ctx) {
		throw new Error('useContext must be used within a Provider');
	}
	return ctx;
}

export function useEditorInstance(): Pick<ContextValue, 'editor' | 'setEditor'> {
	const { editor, setEditor } = useContext();
	return { editor, setEditor };
}

export function useSidebarVisibility(): Pick<ContextValue, 'activeSidebar' | 'animate' | 'setActiveSidebar' | 'toggleSidebar'> {
	const { activeSidebar, animate, setActiveSidebar, toggleSidebar } = useContext();
	return { activeSidebar, animate, setActiveSidebar, toggleSidebar };
}

interface ProviderProps {
	readonly children: ReactNode;
	readonly documentId: string | undefined;
}

export function Provider({
	children,
	documentId,
}: ProviderProps): React.JSX.Element {
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

	const value = useMemo<ContextValue>(() => ({
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
		<Context.Provider value={value}>
			{children}
		</Context.Provider>
	);
}
