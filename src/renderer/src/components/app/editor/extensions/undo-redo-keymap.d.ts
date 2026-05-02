import { Extension } from '@tiptap/core';
export interface UndoRedoKeymapOptions {
    onUndo: () => void;
    onRedo: () => void;
}
export declare const UndoRedoKeymapExtension: Extension<UndoRedoKeymapOptions, any>;
