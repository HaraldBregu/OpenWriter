import { useState, useCallback, useEffect } from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';
import {
	AppAlertDialog,
	AppAlertDialogAction,
	AppAlertDialogCancel,
	AppAlertDialogContent,
	AppAlertDialogDescription,
	AppAlertDialogFooter,
	AppAlertDialogHeader,
	AppAlertDialogTitle,
	AppButton,
} from '../../components/app';
import { useAppDispatch, useAppSelector } from '../../store';
import {
	selectResources,
	selectResourcesStatus,
	selectResourcesError,
	selectImporting,
	selectCurrentWorkspacePath,
	selectIndexingInfo,
	removeResources,
	importResourcesRequested,
	loadIndexingInfo,
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
	const indexingInfo = useAppSelector(selectIndexingInfo);

	const indexingTask = useTaskListener<{
		indexedCount: number;
		failedIds: string[];
		totalChunks: number;
	}>('index-resources');

	const loading = status === 'idle' || status === 'loading';
	const indexing = indexingTask.isRunning || indexingTask.isQueued;
	const [editing, setEditing] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [removing, setRemoving] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	// Load indexing info on mount
	useEffect(() => {
		dispatch(loadIndexingInfo());
	}, [dispatch]);

	// Reload indexing info after indexing completes
	useEffect(() => {
		if (indexingTask.isCompleted) {
			dispatch(loadIndexingInfo());
		}
	}, [indexingTask.isCompleted, dispatch]);

	const handleIndex = useCallback(() => {
		if (!workspacePath || indexing) return;
		const resourcesPath = `${workspacePath}/${RESOURCES_DIR}`;
		window.task.submit('index-resources', { workspacePath, resourcesPath });
	}, [workspacePath, indexing]);

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

	const handleOpenDataFolder = useCallback(() => {
		window.workspace.openDataFolder();
	}, []);

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

			{!indexing && indexingInfo && (
				<div className="px-6 py-3 border-b shrink-0">
					<div className="flex items-center gap-4 text-xs text-muted-foreground">
						<span>Last indexed: {new Date(indexingInfo.lastIndexedAt).toLocaleString()}</span>
						<span>{indexingInfo.indexedCount} documents</span>
						<span>{indexingInfo.totalChunks} chunks</span>
						{indexingInfo.failedCount > 0 && (
							<span className="text-destructive">{indexingInfo.failedCount} failed</span>
						)}
						<AppButton
							variant="ghost"
							size="icon-micro"
							className="ml-auto h-3.5 w-3.5 [&_svg]:size-[8px]"
							onClick={handleOpenDataFolder}
						>
							<FolderOpen />
						</AppButton>
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
