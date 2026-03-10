import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
	AppAlertDialog,
	AppAlertDialogAction,
	AppAlertDialogCancel,
	AppAlertDialogContent,
	AppAlertDialogDescription,
	AppAlertDialogFooter,
	AppAlertDialogHeader,
	AppAlertDialogTitle,
} from '../../components/app';
import { useAppDispatch, useAppSelector } from '../../store';
import {
	selectDocuments,
	selectDocumentsStatus,
	selectDocumentsError,
	selectImporting,
	removeDocuments,
	importDocumentsRequested,
} from '../../store/workspace';
import { SUPPORTED_EXTENSIONS } from './constants';
import { ResourcesHeader } from './ResourcesHeader';
import { ResourcesEmptyState } from './ResourcesEmptyState';
import { ResourcesTable } from './ResourcesTable';

export default function ResourcesPage() {
	const dispatch = useAppDispatch();
	const documents = useAppSelector(selectDocuments);
	const status = useAppSelector(selectDocumentsStatus);
	const error = useAppSelector(selectDocumentsError);
	const uploading = useAppSelector(selectImporting);

	const loading = status === 'idle' || status === 'loading';
	const [editing, setEditing] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [removing, setRemoving] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [indexing, setIndexing] = useState(false);
	const [indexingProgress, setIndexingProgress] = useState(0);

	const handleIndex = useCallback(() => {
		setIndexing(true);
		setIndexingProgress(0);
		// TODO: implement indexing logic
		setIndexing(false);
	}, []);

	const handleUpload = useCallback(() => {
		dispatch(importDocumentsRequested(SUPPORTED_EXTENSIONS));
	}, [dispatch]);

	const handleToggleEdit = useCallback(() => {
		setEditing((prev) => {
			if (prev) setSelected(new Set());
			return !prev;
		});
	}, []);

	const handleConfirmRemove = useCallback(async () => {
		setConfirmOpen(false);
		const ids = [...selected];
		if (ids.length === 0) return;
		setRemoving(true);
		try {
			await dispatch(removeDocuments(ids)).unwrap();
			setSelected(new Set());
		} finally {
			setRemoving(false);
		}
	}, [selected, dispatch]);

	return (
		<div className="flex flex-col h-full">
			<ResourcesHeader
				uploading={uploading}
				onUpload={handleUpload}
				editing={editing}
				onToggleEdit={handleToggleEdit}
				selectedCount={selected.size}
				removing={removing}
				onRemove={() => setConfirmOpen(true)}
				indexing={indexing}
				onIndex={handleIndex}
			/>

			{indexing && (
				<div className="px-6 py-3 border-b shrink-0">
					<div className="flex items-center justify-between mb-1.5">
						<span className="text-sm text-muted-foreground">Indexing resources&hellip;</span>
						<span className="text-sm text-muted-foreground">{indexingProgress}%</span>
					</div>
					<div className="h-2 w-full rounded-full bg-secondary">
						<div
							className="h-full rounded-full bg-primary transition-all duration-300"
							style={{ width: `${indexingProgress}%` }}
						/>
					</div>
				</div>
			)}

			<div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col">
				{loading && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>Loading resources&hellip;</span>
					</div>
				)}

				{error && (
					<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
						{error}
					</div>
				)}

				{!loading && !error && documents.length === 0 && (
					<ResourcesEmptyState uploading={uploading} onUpload={handleUpload} />
				)}

				{!loading && !error && documents.length > 0 && (
					<ResourcesTable
						documents={documents}
						editing={editing}
						selected={selected}
						onSelectedChange={setSelected}
					/>
				)}
			</div>

			<AppAlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AppAlertDialogContent>
					<AppAlertDialogHeader>
						<AppAlertDialogTitle>Remove resources</AppAlertDialogTitle>
						<AppAlertDialogDescription>
							Are you sure you want to remove {selected.size}{' '}
							{selected.size === 1 ? 'resource' : 'resources'}? This action cannot be undone.
						</AppAlertDialogDescription>
					</AppAlertDialogHeader>
					<AppAlertDialogFooter>
						<AppAlertDialogCancel>Cancel</AppAlertDialogCancel>
						<AppAlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleConfirmRemove}
						>
							Remove
						</AppAlertDialogAction>
					</AppAlertDialogFooter>
				</AppAlertDialogContent>
			</AppAlertDialog>
		</div>
	);
}
