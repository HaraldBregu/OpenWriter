import React, { createContext } from 'react';
import type { Editor } from '@tiptap/core';

export interface ContextValue {
	editor: Editor;
}

export const Context = createContext<ContextValue | null>(null);

interface ProviderProps {
	editor: Editor;
	children: React.ReactNode;
}

export function Provider({ editor, children }: ProviderProps): React.JSX.Element {
	return <Context.Provider value={{ editor }}>{children}</Context.Provider>;
}
