import type { Editor } from '@tiptap/core';
import type { DocumentSelection } from '../context/state';
export declare function getSelectedEditorText(editor: Editor | null, selection: DocumentSelection | null): string | null;
export declare function buildChatTaskPrompt(input: string, selectedText: string | null): string;
export declare function stripTaskPromptMarkers(text: string): string;
export declare function normalizeTaskPromptContext(before: string, after: string): {
    before: string;
    after: string;
};
