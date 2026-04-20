import type { Editor } from '@tiptap/core';

export interface PromptSubmitPayload {
    prompt: string;
    files: File[];
    editor: Editor;
}

export interface PromptOptions {
    onPromptSubmit: (payload: PromptSubmitPayload) => void;
}
