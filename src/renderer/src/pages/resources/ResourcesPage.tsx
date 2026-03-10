import { useState, useCallback, useEffect, useRef, memo } from 'react';
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
	selectDocumentIndexingTaskId,
	selectCurrentWorkspacePath,
	removeDocuments,
	importDocumentsRequested,
	indexResources,
	documentIndexingFinished,
} from '../../store/workspace';
import { subscribeToTask } from '../../services/task-event-bus';
import { SUPPORTED_EXTENSIONS } from './constants';
import { ResourcesHeader } from './ResourcesHeader';
import { ResourcesEmptyState } from './ResourcesEmptyState';
import { ResourcesTable } from './ResourcesTable';
import type { TaskEvent } from '../../../../shared/types';

/**
 * Isolated progress bar component – its frequent state updates
 * (indexingProgress / indexingMessage) no longer cause the parent
 * or sibling components to re-render.
 */
const IndexingProgressBar = memo(function IndexingProgressBar({
	indexingTaskId,
}: {
	indexingTaskId: string;
}) {
	const dispatch = useAppDispatch();
	const [progress, setProgress] = useState(0);
	const [message, setMessage] = useState('Submitting indexing task\u2026');
	const unsubRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		unsubRef.current?.();
		unsubRef.current = null;

		const snapshotUnsub = subscribeToTask(indexingTaskId, (snapshot) => {
			if (snapshot.status === 'completed') {
				setProgress(100);
				setMessage('Indexing complete');
				dispatch(documentIndexingFinished());
			}
			if (snapshot.status === 'error' || snapshot.status === 'cancelled') {
				setProgress(0);
				setMessage('');
				dispatch(documentIndexingFinished());
			}
		});

		const taskId = indexingTaskId;
		const progressUnsub = window.task.onEvent((event: TaskEvent) => {
			if (event.type !== 'progress') return;
			const data = event.data as { taskId: string; percent: number; message?: string };
			if (data.taskId !== taskId) return;
			setProgress(data.percent);
			if (data.message) setMessage(data.message);
		});

		unsubRef.current = () => {
			snapshotUnsub();
			progressUnsub();
		};

		return () => {
			unsubRef.current?.();
			unsubRef.current = null;
		};
	}, [indexingTaskId, dispatch]);

	return (
		<div className="px-6 py-3 border-b shrink-0">
			<div className="flex items-center justify-between mb-1.5">
				<span className="text-sm text-muted-foreground">
					{message || 'Indexing resources\u2026'}
				</span>
				<span className="text-sm text-muted-foreground">{progress}%</span>
			</div>
			<div className="h-2 w-full rounded-full bg-secondary">
				<div
					className="h-full rounded-full bg-primary transition-all duration-300"
					style={{ width: `${progress}%` }}
				/>
			</div>
		</div>
	);
});

export default function ResourcesPage() {
	const dispatch = useAppDispatch();
	const documents = useAppSelector(selectDocuments);
	const status = useAppSelector(selectDocumentsStatus);
	const error = useAppSelector(selectDocumentsError);
	const uploading = useAppSelector(selectImporting);
	const indexingTaskId = useAppSelector(selectDocumentIndexingTaskId);

	const loading = status === 'idle' || status === 'loading';
	const indexing = indexingTaskId !== null;
	const [editing, setEditing] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [removing, setRemoving] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	const handleIndex = useCallback(() => {
		dispatch(indexResources());
	}, [dispatch]);

	const handleUpload = useCallback(() => {
		dispatch(importDocumentsRequested(SUPPORTED_EXTENSIONS));
	}, [dispatch]);

	const handleToggleEdit = useCallback(() => {
		setEditing((prev) => {
			if (prev) setSelected(new Set());
			return !prev;
		});
	}, []);

	const handleOpenConfirm = useCallback(() => {
		setConfirmOpen(true);
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
				onRemove={handleOpenConfirm}
				indexing={indexing}
				onIndex={handleIndex}
			/>

			{indexingTaskId && <IndexingProgressBar indexingTaskId={indexingTaskId} />}

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
