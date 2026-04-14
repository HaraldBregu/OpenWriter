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
import { useContext } from '../hooks/use-context';

export function DeleteConfirmDialog(): ReactElement {
	const { t } = useTranslation();
	const { selected, confirmOpen, setConfirmOpen, handleConfirmDelete } = useContext();

	return (
		<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t('resources.removeItems')}</AlertDialogTitle>
					<AlertDialogDescription>
						{t('resources.removeConfirm', { count: selected.size })}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
					<AlertDialogAction
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						onClick={handleConfirmDelete}
					>
						{t('resources.remove')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
