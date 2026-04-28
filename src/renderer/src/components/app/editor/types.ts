import type { Editor as TiptapEditor } from '@tiptap/core';

export interface PromptSubmitPayload {
	prompt: string;
	selectedText: string;
	files: File[];
	editor: TiptapEditor;
}
