import type { ReactElement } from 'react';
import type { ResourceInfo } from '../../../../../../shared/types';
interface MarkdownPreviewDialogProps {
    readonly item: ResourceInfo | null;
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
}
export declare function MarkdownPreviewDialog({ item, open, onOpenChange, }: MarkdownPreviewDialogProps): ReactElement | null;
export {};
