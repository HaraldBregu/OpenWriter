import React from 'react';
import type { Editor } from '@tiptap/core';
interface ProviderProps {
    editor: Editor;
    containerRef: React.RefObject<HTMLDivElement | null>;
    onImageInsert?: (result: {
        src: string;
        alt: string;
        title: string;
    }) => void;
    children: React.ReactNode;
}
export declare function Provider({ editor, containerRef, onImageInsert, children, }: ProviderProps): React.JSX.Element;
export {};
