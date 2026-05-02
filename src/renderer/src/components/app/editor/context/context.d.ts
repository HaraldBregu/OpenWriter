import type React from 'react';
import type { Editor } from '@tiptap/core';
import type { EditorState } from './state';
export interface EditorContextValue {
    state: EditorState;
    editor: Editor;
    containerRef: React.RefObject<HTMLDivElement | null>;
    setImageDialogOpen: (open: boolean) => void;
}
export declare const EditorContext: React.Context<EditorContextValue | null>;
