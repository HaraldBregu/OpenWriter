import { Plugin } from '@tiptap/pm/state';
export type ImageInsertHandler = (file: File, insertAtPos: number | null) => void;
export declare function fileToDataUri(file: File): Promise<string>;
export declare function createImageDropPastePlugin(onImageInsert: ImageInsertHandler): Plugin;
