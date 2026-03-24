import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Editor } from '@tiptap/core';

interface EditorInstanceContextValue {
	editor: Editor | null;
	setEditor: (editor: Editor | null) => void;
}

const EditorInstanceContext = createContext<EditorInstanceContextValue | null>(null);

interface EditorInstanceProviderProps {
	readonly children: React.ReactNode;
}

export function EditorInstanceProvider({
	children,
}: EditorInstanceProviderProps): React.JSX.Element {
	const [editor, setEditorState] = useState<Editor | null>(null);

	const setEditor = useCallback((ed: Editor | null) => {
		setEditorState(ed);
	}, []);

	return (
		<EditorInstanceContext.Provider value={{ editor, setEditor }}>
			{children}
		</EditorInstanceContext.Provider>
	);
}

export function useEditorInstance(): EditorInstanceContextValue {
	const ctx = useContext(EditorInstanceContext);
	if (!ctx) {
		throw new Error('useEditorInstance must be used within an EditorInstanceProvider');
	}
	return ctx;
}
