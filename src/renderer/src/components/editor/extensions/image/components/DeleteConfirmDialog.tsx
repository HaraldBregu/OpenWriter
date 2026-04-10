import React from 'react';
import { useTranslation } from 'react-i18next';
import {
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogAction,
	AlertDialogCancel,
} from '@/components/ui/AlertDialog';

interface DeleteConfirmDialogProps {
	onConfirm: () => void;
	trigger: React.ReactElement;
}

export function DeleteConfirmDialog({
	onConfirm,
	trigger,
}: DeleteConfirmDialogProps): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<AlertDialog>
			<AlertDialogTrigger render={trigger} />
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t('imageNode.deleteImage')}</AlertDialogTitle>
					<AlertDialogDescription>
						{t('imageNode.deleteImageDescription')}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t('imageNode.cancel')}</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive"
					>
						{t('imageNode.delete')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
