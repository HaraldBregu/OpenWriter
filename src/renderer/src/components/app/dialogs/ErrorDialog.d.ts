import type { ReactElement, ReactNode } from 'react';
export interface ErrorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: ReactNode;
    description: ReactNode;
    dismissLabel?: ReactNode;
    onDismiss?: () => void;
}
/**
 * Generic error dialog. Single dismiss action — use for surfaced failures
 * that the user just needs to acknowledge (e.g. failed task results).
 */
export declare function ErrorDialog({ open, onOpenChange, title, description, dismissLabel, onDismiss, }: ErrorDialogProps): ReactElement;
