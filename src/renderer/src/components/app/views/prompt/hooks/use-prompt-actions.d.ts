import type React from 'react';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { PromptOptions } from '../../../editor/extensions/prompt-extension';
import { Action } from '../context';
interface UseContentGeneratorActionsParams {
    dispatch: React.Dispatch<Action>;
    editor: Editor;
    node: ProseMirrorNode;
    getPos: () => number | undefined;
    options: PromptOptions;
    updateAttributes: (attrs: Record<string, unknown>) => void;
    prompt: string;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
}
export declare function usePromptActions({ dispatch, editor, node, getPos, options, updateAttributes, prompt, fileInputRef, }: UseContentGeneratorActionsParams): {
    handlePromptChange: (value: string) => void;
    addFile: (newFile: File) => void;
    removeFile: (index: number) => void;
    handleFilesChange: (files: File[]) => void;
    handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleOpenFilePicker: () => void;
    handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    deleteNode: () => void;
    submit: () => void;
};
export {};
