import React from 'react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import type { PromptSubmitPayload } from './types';
export interface EditorElement extends HTMLDivElement {
    setContent: (markdown: string, options?: {
        preventEditorUpdate?: boolean;
    }) => void;
    insertText: (text: string, options?: {
        preventEditorUpdate?: boolean;
    }) => void;
    deleteText: (from: number, to: number, options?: {
        preventEditorUpdate?: boolean;
    }) => void;
    insertMarkdown: (markdown: string, options?: {
        from?: number;
        preventEditorUpdate?: boolean;
    }) => void;
    insertMarkdownText: (markdown: string, options?: {
        from?: number;
        to?: number;
        preventEditorUpdate?: boolean;
    }) => void;
    setSearch: (query: string) => void;
    clearSearch: () => void;
    removeAssistant: () => void;
    setAssistantLoading: (loading: boolean) => void;
    setAssistantEnable: (enable: boolean) => void;
    insertPromptView: () => void;
    splitBlock: () => void;
    setHeading: (level: 1 | 2 | 3 | 4 | 5 | 6) => void;
    ensureBulletList: () => void;
    ensureOrderedList: () => void;
    exitList: () => void;
}
export interface EditorProps {
    value: string;
    onChange: (value: string) => void;
    onSelectionChange?: (selection: {
        from: number;
        to: number;
    } | null) => void;
    externalValueVersion?: number;
    className?: string;
    disabled?: boolean;
    id?: string;
    onReviewPromptSubmit?: (payload: PromptSubmitPayload) => void;
    onWritePromptSubmit?: (payload: PromptSubmitPayload) => void;
    onUndo?: () => void;
    onRedo?: () => void;
    /** Called when the TipTap editor instance becomes available or is destroyed. */
    onEditorReady?: (editor: TiptapEditor | null) => void;
    /** Absolute path of the folder containing the markdown source, used to resolve relative image paths. */
    documentBasePath?: string | null;
}
declare const Editor: React.NamedExoticComponent<EditorProps & React.RefAttributes<EditorElement>>;
export { Editor };
