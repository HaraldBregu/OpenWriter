import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
	AppAlertDialog,
	AppAlertDialogAction,
	AppAlertDialogCancel,
	AppAlertDialogContent,
	AppAlertDialogDescription,
	AppAlertDialogFooter,
	AppAlertDialogHeader,
	AppAlertDialogTitle,
} from '@/components/app';
import { useContentContext } from '../context/ContentContext';

export function DeleteConfirmDialog(): ReactElement {
	const { t } = useTranslation();
	const { selected, confirmOpen, setConfirmOpen, handleConfirmDelete } = useContentContext();

	return (
		<AppAlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
			<AppAlertDialogContent>
				<AppAlertDialogHeader>
					<AppAlertDialogTitle>{t('resources.removeItems')}</AppAlertDialogTitle>
					<AppAlertDialogDescription>
						{t('resources.removeConfirm', { count: selected.size })}
					</AppAlertDialogDescription>
				</AppAlertDialogHeader>
				<AppAlertDialogFooter>
					<AppAlertDialogCancel>{t('common.cancel')}</AppAlertDialogCancel>
					<AppAlertDialogAction
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						onClick={handleConfirmDelete}
					>
						{t('resources.remove')}
					</AppAlertDialogAction>
				</AppAlertDialogFooter>
			</AppAlertDialogContent>
		</AppAlertDialog>
	);
}
