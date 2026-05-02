import { type RefObject } from 'react';
import type { EditorElement } from '@/components/app/editor/Editor';
export interface EditorActions {
    showLoading: () => void;
    hideLoading: () => void;
    enable: () => void;
    disable: () => void;
    closePrompt: () => void;
    insertPromptView: () => void;
    insertText: (text: string, options?: {
        preventEditorUpdate?: boolean;
    }) => void;
    insertMarkdownText: (text: string, options?: {
        from?: number;
        to?: number;
        preventEditorUpdate?: boolean;
    }) => void;
}
export declare function useEditor(editorRef: RefObject<EditorElement | null>): EditorActions;
