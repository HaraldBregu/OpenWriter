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
import { useDeleteDocument } from '../hooks/use-delete-document';
import { useInfoDispatch } from '../hooks/use-info-dispatch';
import { useInfoState } from '../hooks/use-info-state';

export function DeleteDocumentDialog(): React.ReactElement {
	const { t } = useTranslation();
	const { confirmDeleteOpen, isDeleting } = useInfoState();
	const dispatch = useInfoDispatch();
	const handleDeletePermanently = useDeleteDocument();

	return (
		<AlertDialog
			open={confirmDeleteOpen}
			onOpenChange={(open) => dispatch({ type: 'CONFIRM_DELETE_OPEN_CHANGED', open })}
		>
			<AlertDialogContent size='sm'>
				<AlertDialogHeader>
					<AlertDialogTitle>{t('configSidebar.deleteDocumentTitle')}</AlertDialogTitle>
					<AlertDialogDescription>
						{t('configSidebar.deleteDocumentConfirm')}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
					<AlertDialogAction
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						onClick={handleDeletePermanently}
						disabled={isDeleting}
					>
						{t('common.delete')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
