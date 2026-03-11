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
	selectResources,
	selectResourcesStatus,
	selectResourcesError,
	selectImporting,
	selectCurrentWorkspacePath,
	removeResources,
	importResourcesRequested,
} from '../../store/workspace';
import { useTaskListener } from '../../hooks/use-task-listener';
import { SUPPORTED_EXTENSIONS } from './constants';
import { ResourcesHeader } from './ResourcesHeader';
import { ResourcesEmptyState } from './ResourcesEmptyState';
import { ResourcesTable } from './ResourcesTable';

const RESOURCES_DIR = 'resources';

export default function ResourcesPage() {
	const dispatch = useAppDispatch();
	const resources = useAppSelector(selectResources);
	const status = useAppSelector(selectResourcesStatus);
	const error = useAppSelector(selectResourcesError);
	const uploading = useAppSelector(selectImporting);
	const workspacePath = useAppSelector(selectCurrentWorkspacePath);

	const indexingTask = useTask<
		{ workspacePath: string; resourcesPath: string },
		{ indexedCount: number; failedIds: string[]; skippedCount: number; totalChunks: number }
	>('index-resources', { workspacePath: workspacePath ?? '', resourcesPath: '' });

	const loading = status === 'idle' || status === 'loading';
	const indexing = indexingTask.isRunning || indexingTask.isQueued;
	const [editing, setEditing] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [removing, setRemoving] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	const handleIndex = useCallback(() => {
		if (!workspacePath) return;
		const resourcesPath = `${workspacePath}/${RESOURCES_DIR}`;
		indexingTask.submit({ workspacePath, resourcesPath });
	}, [workspacePath, indexingTask]);

	const handleUpload = useCallback(() => {
		dispatch(importResourcesRequested(SUPPORTED_EXTENSIONS));
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
			await dispatch(removeResources(ids)).unwrap();
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

			{indexing && (
				<div className="px-6 py-3 border-b shrink-0">
					<div className="flex items-center gap-2">
						<Loader2 className="h-4 w-4 animate-spin text-primary" />
						<span className="text-sm text-muted-foreground">Indexing resources&hellip;</span>
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

				{!loading && !error && resources.length === 0 && (
					<ResourcesEmptyState uploading={uploading} onUpload={handleUpload} />
				)}

				{!loading && !error && resources.length > 0 && (
					<ResourcesTable
						documents={resources}
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
