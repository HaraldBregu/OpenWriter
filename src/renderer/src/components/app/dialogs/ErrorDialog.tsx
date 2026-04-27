import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/AlertDialog';

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
export function ErrorDialog({
	open,
	onOpenChange,
	title,
	description,
	dismissLabel,
	onDismiss,
}: ErrorDialogProps): ReactElement {
	const { t } = useTranslation();

	const handleDismiss = (): void => {
		onDismiss?.();
		onOpenChange(false);
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent size="sm">
				<AlertDialogHeader>
					<AlertDialogTitle>{title ?? t('common.error', 'Something went wrong')}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogAction className="col-span-2 w-full" onClick={handleDismiss}>
						{dismissLabel ?? t('common.ok', 'OK')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
