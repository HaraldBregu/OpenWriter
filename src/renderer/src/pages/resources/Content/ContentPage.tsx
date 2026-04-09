import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Eye,
	FolderOpen,
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
import { RESOURCE_SECTIONS, type ResourceSectionId } from '../shared/resource-sections';
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
	const uploading = useAppSelector(selectImporting);
	const workspacePath = useAppSelector(selectCurrentWorkspacePath);
	const indexingInfo = useAppSelector(selectIndexingInfo);

	const [resources, setResources] = useState<ResourceInfo[]>([]);
	const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
	const [error, setError] = useState<string | null>(null);

	const loading = status === 'idle' || status === 'loading';
	const [editing, setEditing] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [removing, setRemoving] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [sortKey, setSortKey] = useState<SortKey>('name');
	const [sortDirection, setSortDirection] = useState<SortDirection>('none');
	const [previewResource, setPreviewResource] = useState<ResourceInfo | null>(null);
	const [searchQuery, setSearchQuery] = useState('');

	const filteredResources = useMemo(
		() => filterResourcesBySection(resources, SECTION_ID),
		[resources]
	);

	const loadContent = useCallback(async () => {
		try {
			setStatus('loading');
			setError(null);
			const allResources = await window.workspace.loadDocuments();
			setResources(allResources);
			setStatus('ready');
		} catch (err) {
			setError((err as Error).message || 'Failed to load resources');
			setStatus('error');
		}
	}, []);

	useEffect(() => {
		loadContent();
	}, [loadContent]);

	useEffect(() => {
		setSelected((current) => {
			const resourceIds = new Set(filteredResources.map((resource) => resource.id));
			const nextSelected = new Set([...current].filter((id) => resourceIds.has(id)));
			const hasChanged =
				nextSelected.size !== current.size || [...current].some((id) => !resourceIds.has(id));
			return hasChanged ? nextSelected : current;
		});
	}, [filteredResources]);

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
		const query = searchQuery.trim().toLowerCase();
		const result = resources.filter((r) => {
			if (query && !r.name.toLowerCase().includes(query)) return false;
			return true;
		});

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
	}, [resources, sortDirection, sortKey, searchQuery]);

	const handleUpload = useCallback(async () => {
		try {
			const imported = await window.workspace.importFiles(section.uploadExtensions);
			if (imported.length > 0) {
				await loadContent();
			}
		} catch (err) {
			// Swallow picker-cancellation and validation errors
		}
	}, [section, loadContent]);

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
			await Promise.all(ids.map((id) => window.workspace.deleteDocument(id)));
			await loadContent();
			setSelected(new Set());
		} finally {
			setRemoving(false);
		}
	}, [selected, loadContent]);

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

			<div className="flex shrink-0 items-center gap-3 border-b px-6 py-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Start typing to search"
						className={cn(
							'h-9 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm',
							'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
						)}
					/>
				</div>
			</div>

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
					<div className="flex-1 min-h-0 overflow-auto rounded-md border">
						<AppTable>
							<AppTableHeader className="sticky top-0 z-10 bg-muted">
								<AppTableRow>
									{editing && (
										<AppTableHead className="w-10">
											<AppCheckbox
												checked={someChecked ? 'indeterminate' : allChecked}
												onCheckedChange={handleToggleAll}
												aria-label="Select all"
											/>
										</AppTableHead>
									)}
									<AppTableHead>
										<button
											type="button"
											className="inline-flex items-center transition-colors hover:text-foreground"
											onClick={() => handleSort('name')}
										>
											{t('library.name')}
											<SortIcon active={sortKey === 'name'} direction={sortDirection} />
										</button>
									</AppTableHead>
									<AppTableHead>
										<button
											type="button"
											className="inline-flex items-center transition-colors hover:text-foreground"
											onClick={() => handleSort('mimeType')}
										>
											{t('library.type')}
											<SortIcon active={sortKey === 'mimeType'} direction={sortDirection} />
										</button>
									</AppTableHead>
									<AppTableHead className="text-right">
										<button
											type="button"
											className="inline-flex items-center justify-end w-full transition-colors hover:text-foreground"
											onClick={() => handleSort('size')}
										>
											{t('library.size')}
											<SortIcon active={sortKey === 'size'} direction={sortDirection} />
										</button>
									</AppTableHead>
									<AppTableHead>
										<button
											type="button"
											className="inline-flex items-center transition-colors hover:text-foreground"
											onClick={() => handleSort('importedAt')}
										>
											{t('library.imported')}
											<SortIcon active={sortKey === 'importedAt'} direction={sortDirection} />
										</button>
									</AppTableHead>
									<AppTableHead>
										<button
											type="button"
											className="inline-flex items-center transition-colors hover:text-foreground"
											onClick={() => handleSort('lastModified')}
										>
											{t('library.lastModified')}
											<SortIcon active={sortKey === 'lastModified'} direction={sortDirection} />
										</button>
									</AppTableHead>
									<AppTableHead className="w-[50px]" />
								</AppTableRow>
							</AppTableHeader>
							<AppTableBody>
								{sortedResources.length === 0 ? (
									<AppTableRow>
										<AppTableCell
											colSpan={editing ? 7 : 6}
											className="px-4 py-8 text-center text-sm text-muted-foreground"
										>
											No resources match your search.
										</AppTableCell>
									</AppTableRow>
								) : (
									sortedResources.map((resource) => (
										<ResourceRow
											key={resource.id}
											resource={resource}
											editing={editing}
											isSelected={selected.has(resource.id)}
											onToggle={handleToggleRow}
											onPreview={setPreviewResource}
										/>
									))
								)}
							</AppTableBody>
						</AppTable>
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
