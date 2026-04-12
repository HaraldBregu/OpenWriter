import type { ReactElement } from 'react';
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
import { useFilesContext } from '../hooks/use-files-context';

export function DeleteConfirmDialog(): ReactElement {
	const { selected, confirmOpen, setConfirmOpen, handleConfirmDelete } = useFilesContext();

	return (
		<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete files</AlertDialogTitle>
					<AlertDialogDescription>
						{selected.size === 1
							? 'This will permanently delete 1 file. This action cannot be undone.'
							: `This will permanently delete ${selected.size} files. This action cannot be undone.`}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						onClick={handleConfirmDelete}
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
