import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Eye,
	FolderOpen,
	ListTree,
	Loader2,
	Pencil,
	Search,
	Trash2,
	Upload,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import type { ResourceInfo } from '../../../../../shared/types';
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
	AppCheckbox,
	AppPageContainer,
	AppPageHeader,
	AppPageHeaderItems,
	AppPageHeaderTitle,
	AppTable,
	AppTableBody,
	AppTableCell,
	AppTableHead,
	AppTableHeader,
	AppTableRow,
} from '@/components/app';
import { cn } from '@/lib/utils';
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
import {
	filterResourcesBySection,
	RESOURCE_SECTIONS,
	getResourceSection,
	type ResourceSectionId,
} from '../shared/resource-sections';
import { formatBytes, formatDate } from '../shared/resource-utils';

const ResourcePreviewSheet = lazy(() =>
	import('../shared/ResourcePreviewSheet').then((module) => ({
		default: module.ResourcePreviewSheet,
	}))
);

const RESOURCES_DIR = 'resources';
const SECTION_ID: ResourceSectionId = 'content';

type SortKey = 'name' | 'mimeType' | 'size' | 'importedAt' | 'lastModified';
type SortDirection = 'none' | 'asc' | 'desc';

function nextSortDirection(current: SortDirection): SortDirection {
	if (current === 'none') return 'asc';
	if (current === 'asc') return 'desc';
	return 'none';
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
	if (!active || direction === 'none')
		return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
	if (direction === 'asc') return <ArrowUp className="ml-1 inline h-3 w-3" />;
	return <ArrowDown className="ml-1 inline h-3 w-3" />;
}

interface ResourceRowProps {
	readonly resource: ResourceInfo;
	readonly editing: boolean;
	readonly isSelected: boolean;
	readonly onToggle: (id: string) => void;
	readonly onPreview: (resource: ResourceInfo) => void;
}

function ResourceRow({ resource, editing, isSelected, onToggle, onPreview }: ResourceRowProps) {
	return (
		<AppTableRow data-state={editing && isSelected ? 'selected' : undefined}>
			{editing && (
				<AppTableCell className="w-10">
					<AppCheckbox checked={isSelected} onCheckedChange={() => onToggle(resource.id)} />
				</AppTableCell>
			)}
			<AppTableCell className="max-w-[300px] truncate font-medium">{resource.name}</AppTableCell>
			<AppTableCell className="text-muted-foreground">{resource.mimeType}</AppTableCell>
			<AppTableCell className="text-right tabular-nums text-muted-foreground">
				{formatBytes(resource.size)}
			</AppTableCell>
			<AppTableCell className="text-muted-foreground">
				{formatDate(resource.importedAt)}
			</AppTableCell>
			<AppTableCell className="text-muted-foreground">
				{formatDate(resource.lastModified)}
			</AppTableCell>
			<AppTableCell>
				<AppButton
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={() => onPreview(resource)}
				>
					<Eye className="h-4 w-4" />
				</AppButton>
			</AppTableCell>
		</AppTableRow>
	);
}

export default function ContentPage(): React.ReactElement {
	const { t } = useTranslation();
	const dispatch = useAppDispatch();
	const section = RESOURCE_SECTIONS[SECTION_ID];
	const allResources = useAppSelector(selectResources);
	const status = useAppSelector(selectResourcesStatus);
	const error = useAppSelector(selectResourcesError);
	const uploading = useAppSelector(selectImporting);
	const workspacePath = useAppSelector(selectCurrentWorkspacePath);
	const indexingInfo = useAppSelector(selectIndexingInfo);

	const resources = useMemo(
		() => filterResourcesBySection(allResources, SECTION_ID),
		[allResources]
	);

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
	const [sortKey, setSortKey] = useState<SortKey>('name');
	const [sortDirection, setSortDirection] = useState<SortDirection>('none');
	const [previewResource, setPreviewResource] = useState<ResourceInfo | null>(null);

	useEffect(() => {
		dispatch(loadIndexingInfo());
	}, [dispatch]);

	useEffect(() => {
		if (indexingTask.isCompleted) {
			dispatch(loadIndexingInfo());
		}
	}, [dispatch, indexingTask.isCompleted]);

	useEffect(() => {
		setSelected((current) => {
			const resourceIds = new Set(resources.map((resource) => resource.id));
			const nextSelected = new Set([...current].filter((id) => resourceIds.has(id)));
			const hasChanged =
				nextSelected.size !== current.size || [...current].some((id) => !resourceIds.has(id));
			return hasChanged ? nextSelected : current;
		});
	}, [resources]);

	const handleSort = useCallback(
		(key: SortKey) => {
			if (key === sortKey) {
				setSortDirection((d) => nextSortDirection(d));
			} else {
				setSortKey(key);
				setSortDirection('asc');
			}
		},
		[sortKey]
	);

	const sortedResources = useMemo(() => {
		const result = [...resources];

		if (sortDirection !== 'none') {
			result.sort((a, b) => {
				let cmp: number;
				if (sortKey === 'name' || sortKey === 'mimeType') {
					cmp = a[sortKey].localeCompare(b[sortKey]);
				} else {
					cmp = a[sortKey] - b[sortKey];
				}
				return sortDirection === 'asc' ? cmp : -cmp;
			});
		}

		return result;
	}, [resources, sortDirection, sortKey]);

	const handleIndex = useCallback(() => {
		if (!workspacePath || indexing) {
			return;
		}

		window.task.submit('index-resources', {
			workspacePath,
			resourcesPath: `${workspacePath}/${RESOURCES_DIR}`,
		});
	}, [indexing, workspacePath]);

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

	const handleOpenResourcesFolder = useCallback(() => {
		window.workspace.openResourcesFolder();
	}, []);

	const handleOpenDataFolder = useCallback(() => {
		window.workspace.openDataFolder();
	}, []);

	const handleDelete = useCallback(() => {
		if (selected.size === 0) return;
		setConfirmOpen(true);
	}, [selected]);

	const handleConfirmDelete = useCallback(async () => {
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

	const allChecked = sortedResources.length > 0 && sortedResources.every((r) => selected.has(r.id));
	const someChecked = !allChecked && sortedResources.some((r) => selected.has(r.id));

	const handleToggleAll = useCallback(() => {
		setSelected((current) => {
			const next = new Set(current);
			if (allChecked) {
				sortedResources.forEach((r) => next.delete(r.id));
			} else {
				sortedResources.forEach((r) => next.add(r.id));
			}
			return next;
		});
	}, [allChecked, sortedResources]);

	const handleToggleRow = useCallback((id: string) => {
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	return (
		<AppPageContainer>
			<AppPageHeader>
				<AppPageHeaderTitle>{t(section.titleKey)}</AppPageHeaderTitle>
				<AppPageHeaderItems>
					<AppButton
						size="icon"
						variant="outline"
						className="h-8 w-8"
						onClick={handleOpenResourcesFolder}
						disabled={editing}
					>
						<FolderOpen className="h-3.5 w-3.5" />
					</AppButton>
					<AppButton
						size="icon"
						variant="outline"
						className="h-8 w-8"
						onClick={handleIndex}
						disabled={indexing || editing}
					>
						<ListTree className="h-3.5 w-3.5" />
					</AppButton>
					<AppButton
						size="icon"
						variant="outline"
						className="h-8 w-8"
						onClick={handleUpload}
						disabled={uploading || editing}
						title={t(section.uploadKey)}
					>
						<Upload className="h-3.5 w-3.5" />
					</AppButton>
					{editing && selected.size > 0 && (
						<AppButton size="sm" variant="destructive" disabled={removing} onClick={handleDelete}>
							<Trash2 className="mr-1.5 h-3.5 w-3.5" />
							{t('resources.removeWithCount', { count: selected.size })}
						</AppButton>
					)}
					<AppButton
						size="icon"
						variant={editing ? 'secondary' : 'outline'}
						className="h-8 w-8"
						onClick={handleToggleEdit}
					>
						<Pencil className="h-3.5 w-3.5" />
					</AppButton>
				</AppPageHeaderItems>
			</AppPageHeader>

			{indexing && (
				<div className="border-b px-6 py-3 shrink-0">
					<div className="flex items-center gap-2">
						<Loader2 className="h-4 w-4 animate-spin text-primary" />
						<span className="text-sm text-muted-foreground">{t('resources.media.indexing')}</span>
					</div>
				</div>
			)}

			{!indexing && indexingInfo && (
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

			<div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
				{loading && (
					<div className="flex flex-1 items-center justify-center py-16">
						<p className="text-sm text-muted-foreground">{t(section.loadingKey)}</p>
					</div>
				)}

				{error && (
					<div className="m-6 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
						{error}
					</div>
				)}

				{!loading && !error && resources.length === 0 && (
					<div className="flex flex-1 items-center justify-center">
						<p className="text-sm text-muted-foreground">{t(section.emptyKey)}</p>
					</div>
				)}

				{!loading && !error && resources.length > 0 && (
					<div className="flex-1 min-h-0 overflow-auto">
						<table className="w-full text-left">
							<thead className="sticky top-0 z-10 bg-background border-b">
								<tr>
									{editing && (
										<th className="w-10 px-4 py-3">
											<AppCheckbox
												checked={someChecked ? 'indeterminate' : allChecked}
												onCheckedChange={handleToggleAll}
												aria-label="Select all"
											/>
										</th>
									)}
									<th className="px-4 py-3 text-xs font-medium text-muted-foreground">
										<button
											type="button"
											className="inline-flex items-center transition-colors hover:text-foreground"
											onClick={() => handleSort('name')}
										>
											{t('library.name')}
											<SortIcon active={sortKey === 'name'} direction={sortDirection} />
										</button>
									</th>
									<th className="px-4 py-3 text-xs font-medium text-muted-foreground">
										<button
											type="button"
											className="inline-flex items-center transition-colors hover:text-foreground"
											onClick={() => handleSort('mimeType')}
										>
											{t('library.type')}
											<SortIcon active={sortKey === 'mimeType'} direction={sortDirection} />
										</button>
									</th>
									<th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
										<button
											type="button"
											className="inline-flex items-center justify-end w-full transition-colors hover:text-foreground"
											onClick={() => handleSort('size')}
										>
											{t('library.size')}
											<SortIcon active={sortKey === 'size'} direction={sortDirection} />
										</button>
									</th>
									<th className="px-4 py-3 text-xs font-medium text-muted-foreground">
										<button
											type="button"
											className="inline-flex items-center transition-colors hover:text-foreground"
											onClick={() => handleSort('importedAt')}
										>
											{t('library.imported')}
											<SortIcon active={sortKey === 'importedAt'} direction={sortDirection} />
										</button>
									</th>
									<th className="px-4 py-3 text-xs font-medium text-muted-foreground">
										<button
											type="button"
											className="inline-flex items-center transition-colors hover:text-foreground"
											onClick={() => handleSort('lastModified')}
										>
											{t('library.lastModified')}
											<SortIcon active={sortKey === 'lastModified'} direction={sortDirection} />
										</button>
									</th>
									<th className="w-10 px-4 py-3" />
								</tr>
							</thead>
							<tbody>
								{sortedResources.map((resource) => (
									<ResourceRow
										key={resource.id}
										resource={resource}
										editing={editing}
										isSelected={selected.has(resource.id)}
										onToggle={handleToggleRow}
										onPreview={setPreviewResource}
									/>
								))}
							</tbody>
						</table>
					</div>
				)}

				{previewResource && (
					<Suspense fallback={null}>
						<ResourcePreviewSheet
							resource={previewResource}
							onClose={() => setPreviewResource(null)}
						/>
					</Suspense>
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
							onClick={handleConfirmDelete}
						>
							{t('resources.remove')}
						</AppAlertDialogAction>
					</AppAlertDialogFooter>
				</AppAlertDialogContent>
			</AppAlertDialog>
		</AppPageContainer>
	);
}
