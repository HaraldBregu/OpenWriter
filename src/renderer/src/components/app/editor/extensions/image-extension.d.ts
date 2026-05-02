import { Node } from '@tiptap/core';
import { type ImageInsertHandler } from '../plugins/image-drop-paste-plugin';
export interface ImageExtensionOptions {
    /**
     * Called for every image File that is dropped or pasted into the editor.
     * The handler is responsible for converting the file, saving it if needed,
     * and inserting the image node. `insertAtPos` is the document position for
     * drops (cursor has already been moved there); it is `null` for pastes
     * (insert at current cursor position).
     *
     * Defaults to converting the file to a data URI and calling setImage.
     */
    onImageInsert?: ImageInsertHandler;
}
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        image: {
            setImage: (attrs: {
                src: string;
                alt?: string;
                title?: string;
            }) => ReturnType;
        };
    }
}
export declare const ImageExtension: Node<ImageExtensionOptions, any>;
