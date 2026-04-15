import { createContext, type Dispatch } from 'react';
import type { Editor } from '@tiptap/core';
import type { DocumentState } from './state';
import type { DocumentAction } from './actions';

export type ActiveSidebar = 'config' | 'agentic' | 'editor' | null;

export interface ContextValue {
	state: DocumentState;
	dispatch: Dispatch<DocumentAction>;
	editor: Editor | null;
	setEditor: (editor: Editor | null) => void;
	activeSidebar: ActiveSidebar;
	animate: boolean;
	setActiveSidebar: (sidebar: ActiveSidebar) => void;
	toggleSidebar: (sidebar: Exclude<ActiveSidebar, null>) => void;
	insertContentDialogOpen: boolean;
	openInsertContentDialog: () => void;
	closeInsertContentDialog: () => void;
}

export const DocumentContext = createContext<ContextValue | null>(null);
