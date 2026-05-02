import { Node } from '@tiptap/core';
import type { ImageInsertHandler } from '../plugins/image-drop-paste-plugin';
export interface ImagePlaceholderOptions {
    onImageInsert?: ImageInsertHandler;
}
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        imagePlaceholder: {
            insertImagePlaceholder: () => ReturnType;
        };
    }
}
export declare const ImagePlaceholderExtension: Node<ImagePlaceholderOptions, any>;
