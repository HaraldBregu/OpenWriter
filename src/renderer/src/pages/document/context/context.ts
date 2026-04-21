import { createContext, type Dispatch } from 'react';
import type { Editor } from '@tiptap/core';
import type { DocumentState } from './state';
import type { DocumentAction } from './actions';

export interface ContextValue {
	state: DocumentState;
	dispatch: Dispatch<DocumentAction>;
	editor: Editor | null;
	setEditor: (editor: Editor | null) => void;
	insertContentDialogOpen: boolean;
	openInsertContentDialog: () => void;
	closeInsertContentDialog: () => void;
}

export const DocumentContext = createContext<ContextValue | null>(null);
