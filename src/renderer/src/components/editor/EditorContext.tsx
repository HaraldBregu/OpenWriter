import React, { createContext } from 'react';
import type { Editor } from '@tiptap/core';

export interface EditorContextValue {
	editor: Editor;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

interface EditorProviderProps {
	editor: Editor;
	children: React.ReactNode;
}

export function EditorProvider({ editor, children }: EditorProviderProps): React.JSX.Element {
	return <EditorContext.Provider value={{ editor }}>{children}</EditorContext.Provider>;
}

export { useEditorContext } from './hooks/use-editor-context';
