import { createContext } from 'react';
import type React from 'react';
import type { Editor } from '@tiptap/core';
import type { EditorState, HoveredBlock } from './state';

export type AssistantAction =
	| 'improve'
	| 'fix-grammar'
	| 'summarize'
	| 'translate'
	| 'continue-writing';

export interface EditorContextValue {
	state: EditorState;
	editor: Editor;
	containerRef: React.RefObject<HTMLDivElement | null>;
	setHoveredBlock: (block: HoveredBlock | null) => void;
	setImageDialogOpen: (open: boolean) => void;
	onInsertContent?: () => void;
	onOpenChat?: () => void;
	onAssistantAction?: (action: AssistantAction, editor: Editor) => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);
