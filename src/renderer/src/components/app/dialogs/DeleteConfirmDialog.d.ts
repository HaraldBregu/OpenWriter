import type { ReactElement, ReactNode } from 'react';
export interface DeleteConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description: ReactNode;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmLabel?: ReactNode;
    cancelLabel?: ReactNode;
}
export declare function DeleteConfirmDialog({ open, onOpenChange, title, description, onConfirm, onCancel, confirmLabel, cancelLabel, }: DeleteConfirmDialogProps): ReactElement;
