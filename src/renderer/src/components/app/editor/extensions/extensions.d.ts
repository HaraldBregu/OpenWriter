import type { AnyExtension } from '@tiptap/core';
import type { ImageInsertHandler } from '../plugins/image-drop-paste-plugin';
import type { PromptSubmitPayload } from '../types';
export interface ExtensionHandlers {
    onPromptSubmit: (payload: PromptSubmitPayload) => void;
    onImageInsert: ImageInsertHandler;
    onUndo: () => void;
    onRedo: () => void;
}
export declare function createExtensions(handlers: ExtensionHandlers): AnyExtension[];
