import type { Editor as TiptapEditor } from '@tiptap/core';

export type AiActionType =
	| 'improve-selected-text-writing'
	| 'fix-selected-text-grammar'
	| 'custom';

export interface PromptSubmitPayload {
	prompt: AiActionType | string;
	selectedText: string;
	files: File[];
	editor: TiptapEditor;
}
