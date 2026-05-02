import React from 'react';
interface InsertImageResult {
    src: string;
    alt: string;
    title: string;
}
interface InsertImageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInsert: (result: InsertImageResult) => void;
}
export declare function InsertImageDialog({ open, onOpenChange, onInsert, }: InsertImageDialogProps): React.JSX.Element;
export {};
