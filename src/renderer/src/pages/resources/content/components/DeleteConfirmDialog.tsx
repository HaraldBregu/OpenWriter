import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { useContentContext } from '../Provider';

export function DeleteConfirmDialog(): ReactElement {
	const { t } = useTranslation();
	const { selected, confirmOpen, setConfirmOpen, handleConfirmDelete } = useContentContext();

	return (
		<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
			<AlertDialogContent size="sm">
				<AlertDialogHeader>
					<AlertDialogTitle>{t('resources.removeItems')}</AlertDialogTitle>
					<AlertDialogDescription>
						{t('resources.removeConfirm', { count: selected.size })}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
						{t('resources.remove')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
