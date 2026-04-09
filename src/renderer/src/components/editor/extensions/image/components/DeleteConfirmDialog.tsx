import React from 'react';
import { useTranslation } from 'react-i18next';
import {
	AppAlertDialog,
	AppAlertDialogTrigger,
	AppAlertDialogContent,
	AppAlertDialogHeader,
	AppAlertDialogFooter,
	AppAlertDialogTitle,
	AppAlertDialogDescription,
	AppAlertDialogAction,
	AppAlertDialogCancel,
} from '@/components/app/AppAlertDialog';

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
		<AppAlertDialog>
			<AppAlertDialogTrigger asChild>{trigger}</AppAlertDialogTrigger>
			<AppAlertDialogContent>
				<AppAlertDialogHeader>
					<AppAlertDialogTitle>{t('imageNode.deleteImage')}</AppAlertDialogTitle>
					<AppAlertDialogDescription>
						{t('imageNode.deleteImageDescription')}
					</AppAlertDialogDescription>
				</AppAlertDialogHeader>
				<AppAlertDialogFooter>
					<AppAlertDialogCancel>{t('imageNode.cancel')}</AppAlertDialogCancel>
					<AppAlertDialogAction
						onClick={onConfirm}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive"
					>
						{t('imageNode.delete')}
					</AppAlertDialogAction>
				</AppAlertDialogFooter>
			</AppAlertDialogContent>
		</AppAlertDialog>
	);
}
