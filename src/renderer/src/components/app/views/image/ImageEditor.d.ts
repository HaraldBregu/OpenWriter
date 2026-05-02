import React from 'react';
import 'react-image-crop/dist/ReactCrop.css';
export type EditMode = 'crop' | 'rotate' | 'resize' | 'ai';
export interface ImageEditorProps {
    src: string;
    alt: string | null;
    initialMode?: EditMode;
    onSave: (dataUri: string) => void;
    onCancel: () => void;
}
export declare function ImageEditor({ src, alt, initialMode, onSave, onCancel, }: ImageEditorProps): React.JSX.Element;
