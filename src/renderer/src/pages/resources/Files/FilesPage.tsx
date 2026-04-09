import { useCallback, useMemo, useState } from 'react';
import { File, FileImage, FileText, Grid3x3, List, Plus, Search, Upload } from 'lucide-react';
import type { ResourceInfo } from '../../../../../shared/types';
import { AppButton } from '@/components/app';
import { AppCheckbox } from '@/components/app';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store';
import {
	importResourcesRequested,
	selectImporting,
	selectResources,
	selectResourcesStatus,
} from '@/store/workspace';
import { filterResourcesBySection, RESOURCE_SECTIONS } from '../shared/resource-sections';
import { formatBytes, formatDate } from '../shared/resource-utils';

type ViewMode = 'list' | 'grid';

const MIME_PREFIX_IMAGE = 'image/';
const MIME_PREFIX_TEXT = 'text/';
const MIME_TYPE_PDF = 'application/pdf';

function getMimeTypeLabel(mimeType: string): string {
	if (mimeType.startsWith(MIME_PREFIX_IMAGE)) return 'Image';
	if (mimeType.startsWith(MIME_PREFIX_TEXT)) return 'Document';
	if (mimeType === MIME_TYPE_PDF) return 'PDF';
	return 'File';
}

function getFileIcon(mimeType: string): React.ReactNode {
	if (mimeType.startsWith(MIME_PREFIX_IMAGE)) {
		return <FileImage className="h-5 w-5 text-muted-foreground" />;
	}
	if (mimeType.startsWith(MIME_PREFIX_TEXT) || mimeType === MIME_TYPE_PDF) {
		return <FileText className="h-5 w-5 text-muted-foreground" />;
	}
	return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatShortDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
	});
}

interface FileRowProps {
	readonly resource: ResourceInfo;
	readonly isSelected: boolean;
	readonly onToggle: (id: string) => void;
}

function FileRow({ resource, isSelected, onToggle }: FileRowProps): React.ReactElement {
	return (
		<tr
			className={cn(
				'border-b transition-colors last:border-b-0',
				isSelected ? 'bg-accent/50' : 'hover:bg-accent/30'
			)}
		>
			<td className="w-10 px-4 py-3">
				<AppCheckbox
					checked={isSelected}
					onCheckedChange={() => onToggle(resource.id)}
					aria-label={`Select ${resource.name}`}
				/>
			</td>
			<td className="px-4 py-3">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
						{getFileIcon(resource.mimeType)}
					</div>
					<div className="min-w-0">
						<p className="truncate font-medium text-sm">{resource.name}</p>
						<p
							className="truncate text-xs text-muted-foreground"
							title={formatDate(resource.importedAt)}
						>
							{resource.path}
						</p>
					</div>
				</div>
			</td>
			<td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
				{formatShortDate(resource.importedAt)}
			</td>
			<td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
				{getMimeTypeLabel(resource.mimeType)}
			</td>
			<td className="whitespace-nowrap px-4 py-3 text-right text-sm text-muted-foreground">
				{formatBytes(resource.size)}
			</td>
		</tr>
	);
}

interface EmptyStateProps {
	readonly uploading: boolean;
	readonly onUpload: () => void;
}

function EmptyState({ uploading, onUpload }: EmptyStateProps): React.ReactElement {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
			<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
				<File className="h-7 w-7 text-muted-foreground" />
			</div>
			<div className="space-y-1">
				<p className="font-medium text-sm">No files yet</p>
				<p className="text-sm text-muted-foreground">Upload files to get started</p>
			</div>
			<AppButton onClick={onUpload} disabled={uploading} size="sm">
				<Upload />
				Upload files
			</AppButton>
		</div>
	);
}

export default function FilesPage(): React.ReactElement {
	const dispatch = useAppDispatch();
	const allResources = useAppSelector(selectResources);
	const status = useAppSelector(selectResourcesStatus);
	const uploading = useAppSelector(selectImporting);

	const resources = useMemo(() => filterResourcesBySection(allResources, 'files'), [allResources]);

	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('list');
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const filteredResources = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return resources;
		return resources.filter((r) => r.name.toLowerCase().includes(query));
	}, [resources, searchQuery]);

	const handleUpload = useCallback(() => {
		dispatch(importResourcesRequested(RESOURCE_SECTIONS.files.uploadExtensions));
	}, [dispatch]);

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

	const isLoading = status === 'idle' || status === 'loading';

	return (
		<div className="flex h-full flex-col">
			<div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
				<h1 className="text-xl font-bold">Files</h1>
				<div className="flex items-center gap-2">
					<AppButton variant="outline" size="sm" disabled>
						<Plus />
						New folder
					</AppButton>
					<AppButton size="sm" onClick={handleUpload} disabled={uploading}>
						<Upload />
						Upload
					</AppButton>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-3 border-b px-6 py-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Start typing to search"
						className={cn(
							'h-9 w-full rounded-full border border-input bg-background pl-9 pr-4 text-sm',
							'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
						)}
					/>
				</div>
				<div className="flex items-center rounded-md border border-input">
					<button
						type="button"
						onClick={() => setViewMode('list')}
						className={cn(
							'flex h-9 w-9 items-center justify-center rounded-l-md transition-colors',
							viewMode === 'list'
								? 'bg-accent text-foreground'
								: 'text-muted-foreground hover:bg-accent/50'
						)}
						aria-label="List view"
						aria-pressed={viewMode === 'list'}
					>
						<List className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={() => setViewMode('grid')}
						className={cn(
							'flex h-9 w-9 items-center justify-center rounded-r-md transition-colors',
							viewMode === 'grid'
								? 'bg-accent text-foreground'
								: 'text-muted-foreground hover:bg-accent/50'
						)}
						aria-label="Grid view"
						aria-pressed={viewMode === 'grid'}
					>
						<Grid3x3 className="h-4 w-4" />
					</button>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-2 border-b px-6 py-2">
				<button
					type="button"
					className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
				>
					<Plus className="h-3 w-3" />
					Owner
				</button>
			</div>

			<div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
				{isLoading && (
					<div className="flex flex-1 items-center justify-center py-16">
						<p className="text-sm text-muted-foreground">Loading files...</p>
					</div>
				)}

				{!isLoading && resources.length === 0 && (
					<EmptyState uploading={uploading} onUpload={handleUpload} />
				)}

				{!isLoading && resources.length > 0 && viewMode === 'list' && (
					<table className="w-full text-left">
						<thead>
							<tr className="border-b">
								<th className="w-10 px-4 py-3" />
								<th className="px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
								<th className="whitespace-nowrap px-4 py-3 text-xs font-medium text-muted-foreground">
									Added
								</th>
								<th className="px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
									File size
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredResources.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
										No files match your search.
									</td>
								</tr>
							) : (
								filteredResources.map((resource) => (
									<FileRow
										key={resource.id}
										resource={resource}
										isSelected={selected.has(resource.id)}
										onToggle={handleToggleRow}
									/>
								))
							)}
						</tbody>
					</table>
				)}

				{!isLoading && resources.length > 0 && viewMode === 'grid' && (
					<div className="flex flex-1 items-center justify-center py-16">
						<p className="text-sm text-muted-foreground">Grid view coming soon.</p>
					</div>
				)}
			</div>
		</div>
	);
}
