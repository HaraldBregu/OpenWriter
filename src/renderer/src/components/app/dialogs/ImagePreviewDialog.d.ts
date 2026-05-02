import React from 'react';
interface ImagePreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    src: string | null;
    alt: string | null;
}
export declare function ImagePreviewDialog({ open, onOpenChange, src, alt, }: ImagePreviewDialogProps): React.JSX.Element;
export {};
