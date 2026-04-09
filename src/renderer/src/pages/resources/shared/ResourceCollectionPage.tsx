import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
	AppPageContainer,
} from '@/components/app';
import { useTaskListener } from '@/hooks/use-task-listener';
import { useAppDispatch, useAppSelector } from '@/store';
import {
	importResourcesRequested,
	loadIndexingInfo,
	removeResources,
	selectCurrentWorkspacePath,
	selectImporting,
	selectIndexingInfo,
	selectResources,
	selectResourcesError,
	selectResourcesStatus,
} from '@/store/workspace';
import { ResourceEmptyState } from './ResourceEmptyState';
import { ResourceSectionHeader } from './ResourceSectionHeader';
import {
	filterResourcesBySection,
	RESOURCE_SECTIONS,
	type ResourceSectionId,
} from './resource-sections';
import { ResourceTable } from './ResourceTable';

const RESOURCES_DIR = 'resources';

interface ResourceCollectionPageProps {
	readonly sectionId: ResourceSectionId;
}

export function ResourceCollectionPage({ sectionId }: ResourceCollectionPageProps) {
	const { t } = useTranslation();
	const dispatch = useAppDispatch();
	const section = RESOURCE_SECTIONS[sectionId];
	const allResources = useAppSelector(selectResources);
	const status = useAppSelector(selectResourcesStatus);
	const error = useAppSelector(selectResourcesError);
	const uploading = useAppSelector(selectImporting);
	const workspacePath = useAppSelector(selectCurrentWorkspacePath);
	const indexingInfo = useAppSelector(selectIndexingInfo);

	const resources = useMemo(
		() => filterResourcesBySection(allResources, sectionId),
		[allResources, sectionId]
	);

	const indexingTask = useTaskListener<{
		indexedCount: number;
		failedIds: string[];
		totalChunks: number;
	}>('index-resources');

	const loading = status === 'idle' || status === 'loading';
	const indexing = section.supportsIndexing && (indexingTask.isRunning || indexingTask.isQueued);
	const [editing, setEditing] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [removing, setRemoving] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	useEffect(() => {
		if (section.supportsIndexing) {
			dispatch(loadIndexingInfo());
		}
	}, [dispatch, section.supportsIndexing]);

	useEffect(() => {
		if (section.supportsIndexing && indexingTask.isCompleted) {
			dispatch(loadIndexingInfo());
		}
	}, [dispatch, indexingTask.isCompleted, section.supportsIndexing]);

	useEffect(() => {
		setSelected((current) => {
			const resourceIds = new Set(resources.map((resource) => resource.id));
			const nextSelected = new Set([...current].filter((id) => resourceIds.has(id)));
			const hasChanged =
				nextSelected.size !== current.size || [...current].some((id) => !resourceIds.has(id));
			return hasChanged ? nextSelected : current;
		});
	}, [resources]);

	const handleIndex = useCallback(() => {
		if (!section.supportsIndexing || !workspacePath || indexing) {
			return;
		}

		window.task.submit('index-resources', {
			workspacePath,
			resourcesPath: `${workspacePath}/${RESOURCES_DIR}`,
		});
	}, [indexing, section.supportsIndexing, workspacePath]);

	const handleUpload = useCallback(() => {
		dispatch(importResourcesRequested(section.uploadExtensions));
	}, [dispatch, section.uploadExtensions]);

	const handleToggleEdit = useCallback(() => {
		setEditing((current) => {
			if (current) {
				setSelected(new Set());
			}
			return !current;
		});
	}, []);

	const handleConfirmRemove = useCallback(async () => {
		setConfirmOpen(false);
		const ids = [...selected];
		if (ids.length === 0) {
			return;
		}

		setRemoving(true);
		try {
			await dispatch(removeResources(ids)).unwrap();
			setSelected(new Set());
		} finally {
			setRemoving(false);
		}
	}, [dispatch, selected]);

	const handleOpenDataFolder = useCallback(() => {
		window.workspace.openDataFolder();
	}, []);

	const handleOpenResourcesFolder = useCallback(() => {
		window.workspace.openResourcesFolder();
	}, []);

	return (
		<AppPageContainer>
			<ResourceSectionHeader
				title={t(section.titleKey)}
				uploading={uploading}
				uploadLabel={t(section.uploadKey)}
				onUpload={handleUpload}
				editing={editing}
				onToggleEdit={handleToggleEdit}
				selectedCount={selected.size}
				removing={removing}
				onRemove={() => setConfirmOpen(true)}
				indexing={indexing}
				showIndexButton={section.supportsIndexing}
				onIndex={handleIndex}
				onOpenFolder={handleOpenResourcesFolder}
			/>

			{indexing && (
				<div className="border-b px-6 py-3 shrink-0">
					<div className="flex items-center gap-2">
						<Loader2 className="h-4 w-4 animate-spin text-primary" />
						<span className="text-sm text-muted-foreground">{t('resources.media.indexing')}</span>
					</div>
				</div>
			)}

			{section.supportsIndexing && !indexing && indexingInfo && (
				<div className="border-b px-6 py-3 shrink-0">
					<div className="flex items-center gap-4 text-xs text-muted-foreground">
						<span>
							{t('library.lastIndexed')} {new Date(indexingInfo.lastIndexedAt).toLocaleString()}
						</span>
						<span>
							{indexingInfo.indexedCount} {t('library.documents')}
						</span>
						<span>
							{indexingInfo.totalChunks} {t('library.chunks')}
						</span>
						{indexingInfo.failedCount > 0 && (
							<span className="text-destructive">
								{indexingInfo.failedCount} {t('library.failed')}
							</span>
						)}
						<AppButton
							variant="ghost"
							size="icon-xs"
							className="ml-auto"
							onClick={handleOpenDataFolder}
						>
							<FolderOpen />
						</AppButton>
					</div>
				</div>
			)}

			<div className="flex flex-1 min-h-0 flex-col overflow-y-auto p-6">
				{loading && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>{t(section.loadingKey)}</span>
					</div>
				)}

				{error && (
					<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
						{error}
					</div>
				)}

				{!loading && !error && resources.length === 0 && (
					<ResourceEmptyState
						icon={section.icon}
						message={t(section.emptyKey)}
						uploadLabel={t(section.uploadKey)}
						uploading={uploading}
						onUpload={handleUpload}
					/>
				)}

				{!loading && !error && resources.length > 0 && (
					<ResourceTable
						resources={resources}
						searchPlaceholder={t(section.searchPlaceholderKey)}
						editing={editing}
						selected={selected}
						onSelectedChange={setSelected}
					/>
				)}
			</div>

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
							onClick={handleConfirmRemove}
						>
							{t('resources.remove')}
						</AppAlertDialogAction>
					</AppAlertDialogFooter>
				</AppAlertDialogContent>
			</AppAlertDialog>
		</AppPageContainer>
	);
}
