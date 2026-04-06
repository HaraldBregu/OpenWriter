import React from 'react';
import { useTranslation } from 'react-i18next';
import {
	AppAlertDialog,
	AppAlertDialogTrigger,
	AppAlertDialogContent,
	AppAlertDialogHeader,
	AppAlertDialogTitle,
	AppAlertDialogDescription,
	AppAlertDialogAction,
	AppAlertDialogCancel,
} from '@/components/app/AppAlertDialog';

interface DeleteConfirmDialogProps {
	onConfirm: () => void;
	trigger: React.ReactNode;
}

export function DeleteConfirmDialog({
	onConfirm,
	trigger,
}: DeleteConfirmDialogProps): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<AppAlertDialog>
			<AppAlertDialogTrigger asChild>{trigger}</AppAlertDialogTrigger>
			<AppAlertDialogContent>
				<AppAlertDialogHeader>
					<AppAlertDialogTitle>{t('imageNode.deleteImage')}</AppAlertDialogTitle>
					<AppAlertDialogDescription>
						{t('imageNode.deleteImageDescription')}
					</AppAlertDialogDescription>
				</AppAlertDialogHeader>
				<div className="flex justify-end gap-2">
					<AppAlertDialogCancel>{t('imageNode.cancel')}</AppAlertDialogCancel>
					<AppAlertDialogAction
						onClick={onConfirm}
						className="bg-destructive hover:bg-destructive/90"
					>
						{t('imageNode.delete')}
					</AppAlertDialogAction>
				</div>
			</AppAlertDialogContent>
		</AppAlertDialog>
	);
}
