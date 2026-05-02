import type React from 'react';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { ImageAction } from '../context/actions';
interface UseImageActionsParams {
    dispatch: React.Dispatch<ImageAction>;
    editor: Editor;
    node: ProseMirrorNode;
    getPos: () => number | undefined;
}
export declare function useImageActions({ dispatch, editor, node, getPos }: UseImageActionsParams): {
    handleError: () => void;
    handleLoad: () => void;
    handleDelete: () => void;
    handleAskAI: () => void;
    handleEdit: () => void;
    handleImageClick: () => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    handleEditorSave: (dataUri: string) => Promise<void>;
    handleEditorCancel: () => void;
    setHovered: (value: boolean) => void;
    setFocused: (value: boolean) => void;
    setPreviewing: (value: boolean) => void;
};
export {};
