import React, { createContext, useReducer, useMemo, useContext, useState, useCallback, type Dispatch, type ReactNode } from 'react';
import { documentReducer } from '../context/reducer';
import { INITIAL_DOCUMENT_STATE, type DocumentState } from '../context/state';
import type { DocumentAction } from '../context/actions';
import type { Editor } from '@tiptap/core';

// --- Document state/dispatch contexts ---

export const DocumentStateContext = createContext<DocumentState | null>(null);
export const DocumentDispatchContext = createContext<Dispatch<DocumentAction> | null>(null);

// --- Editor instance context ---

interface EditorInstanceContextValue {
	editor: Editor | null;
	setEditor: (editor: Editor | null) => void;
}

const EditorInstanceContext = createContext<EditorInstanceContextValue | null>(null);

export function useEditorInstance(): EditorInstanceContextValue {
	const ctx = useContext(EditorInstanceContext);
	if (!ctx) {
		throw new Error('useEditorInstance must be used within a DocumentProvider');
	}
	return ctx;
}

// --- Sidebar visibility context ---

export type ActiveSidebar = 'config' | 'agentic' | 'editor' | null;

interface SidebarVisibilityContextValue {
	activeSidebar: ActiveSidebar;
	animate: boolean;
	setActiveSidebar: (sidebar: ActiveSidebar) => void;
	toggleSidebar: (sidebar: Exclude<ActiveSidebar, null>) => void;
}

const SidebarVisibilityContext = createContext<SidebarVisibilityContextValue | null>(null);

export function useSidebarVisibility(): SidebarVisibilityContextValue {
	const ctx = useContext(SidebarVisibilityContext);
	if (!ctx) {
		throw new Error('useSidebarVisibility must be used within a DocumentProvider');
	}
	return ctx;
}

// --- Combined provider ---

interface DocumentProviderProps {
	readonly children: ReactNode;
	readonly documentId: string | undefined;
}

export function DocumentProvider({
	children,
	documentId,
}: DocumentProviderProps): React.JSX.Element {
	// Document state
	const [state, dispatch] = useReducer(documentReducer, {
		...INITIAL_DOCUMENT_STATE,
		documentId,
	});
	const stableState = useMemo(() => state, [state]);

	// Editor instance
	const [editor, setEditorState] = useState<Editor | null>(null);
	const setEditor = useCallback((ed: Editor | null) => {
		setEditorState(ed);
	}, []);

	// Sidebar visibility
	const [activeSidebar, setActiveSidebar] = useState<ActiveSidebar>('agentic');
	const [animate, setAnimate] = useState(true);

	const toggleSidebar = useCallback((sidebar: Exclude<ActiveSidebar, null>) => {
		setActiveSidebar((prev) => {
			const isSwitching = prev !== null && prev !== sidebar;
			setAnimate(!isSwitching);
			return prev === sidebar ? null : sidebar;
		});
	}, []);

	return (
		<DocumentStateContext.Provider value={stableState}>
			<DocumentDispatchContext.Provider value={dispatch}>
				<EditorInstanceContext.Provider value={{ editor, setEditor }}>
					<SidebarVisibilityContext.Provider
						value={{ activeSidebar, animate, setActiveSidebar, toggleSidebar }}
					>
						{children}
					</SidebarVisibilityContext.Provider>
				</EditorInstanceContext.Provider>
			</DocumentDispatchContext.Provider>
		</DocumentStateContext.Provider>
	);
}
