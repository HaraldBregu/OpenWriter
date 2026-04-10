import { useCallback, useMemo, useState } from 'react';
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	File,
	FileImage,
	FileText,
	Filter,
	FolderOpen,
	Grid3x3,
	List,
	Plus,
	Search,
	Trash2,
	Upload,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/Checkbox';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/Table';
import type { FileEntry } from '../../../../../shared/types';
import { RESOURCE_SECTIONS } from '../shared/resource-sections';
import { formatBytes, formatDate } from '../shared/resource-utils';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/InputGroup';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/AlertDialog';

type ViewMode = 'list' | 'grid';
type FileTypeFilter = 'all' | 'image' | 'pdf' | 'text' | 'other';

const FILE_TYPE_FILTERS: { value: FileTypeFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'image', label: 'Images' },
	{ value: 'pdf', label: 'PDF' },
	{ value: 'text', label: 'Text' },
	{ value: 'other', label: 'Other' },
];

function matchesTypeFilter(mimeType: string, filter: FileTypeFilter): boolean {
	switch (filter) {
		case 'image':
			return mimeType.startsWith(MIME_PREFIX_IMAGE);
		case 'pdf':
			return mimeType === MIME_TYPE_PDF;
		case 'text':
			return mimeType.startsWith(MIME_PREFIX_TEXT) && mimeType !== MIME_TYPE_PDF;
		case 'other':
			return (
				!mimeType.startsWith(MIME_PREFIX_IMAGE) &&
				!mimeType.startsWith(MIME_PREFIX_TEXT) &&
				mimeType !== MIME_TYPE_PDF
			);
		default:
			return true;
	}
}

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

type SortKey = 'name' | 'createdAt' | 'mimeType' | 'size';
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

function formatShortDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
	});
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
			<Button onClick={onUpload} disabled={uploading} size="sm">
				<Upload />
				Upload files
			</Button>
		</div>
	);
}

export default function FilesPage(): React.ReactElement {
	const entries: FileEntry[] = [];
	const isLoading = false;
	const uploading = false;

	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('list');
	const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
	const [sortKey, setSortKey] = useState<SortKey>('name');
	const [sortDirection, setSortDirection] = useState<SortDirection>('none');

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
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [confirmOpen, setConfirmOpen] = useState(false);

	const filteredEntries = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const result = entries.filter((f) => {
			if (query && !f.name.toLowerCase().includes(query)) return false;
			return matchesTypeFilter(f.mimeType, typeFilter);
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
	}, [entries, searchQuery, sortDirection, sortKey, typeFilter]);

	const handleUpload = useCallback(() => {
		void window.workspace.insertFiles(RESOURCE_SECTIONS.files.uploadExtensions);
	}, []);

	const handleOpenFolder = useCallback(() => {
		void window.workspace.openFilesFolder();
	}, []);

	const handleDelete = useCallback(() => {
		if (selected.size === 0) return;
		setConfirmOpen(true);
	}, [selected]);

	const handleConfirmDelete = useCallback(async () => {
		await Promise.all([...selected].map((id) => window.workspace.deleteFileEntry(id)));
		setSelected(new Set());
		setConfirmOpen(false);
	}, [selected]);

	const allChecked = filteredEntries.length > 0 && filteredEntries.every((f) => selected.has(f.id));
	const someChecked = !allChecked && filteredEntries.some((f) => selected.has(f.id));

	const handleToggleAll = useCallback(() => {
		setSelected((current) => {
			const next = new Set(current);
			if (allChecked) {
				filteredEntries.forEach((f) => next.delete(f.id));
			} else {
				filteredEntries.forEach((f) => next.add(f.id));
			}
			return next;
		});
	}, [allChecked, filteredEntries]);

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
		<div className="flex h-full flex-col">
			<div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
				<h1 className="text-xl font-bold">Files</h1>
				<div className="flex items-center gap-2">
					{selected.size > 0 && (
						<Button variant="destructive" size="lg" onClick={handleDelete}>
							<Trash2 />
							Delete ({selected.size})
						</Button>
					)}
					<Button variant="outline" size="lg" onClick={handleOpenFolder}>
						<FolderOpen />
					</Button>
					<Button variant="outline" size="lg" disabled>
						<Plus />
						New folder
					</Button>
					<Button size="lg" onClick={handleUpload} disabled={uploading}>
						<Upload />
						Upload
					</Button>
				</div>
			</div>
			<div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
				<ButtonGroup className="flex-1 gap-2">
					<InputGroup>
						<InputGroupAddon>
							<InputGroupText>
								<Search />
							</InputGroupText>
						</InputGroupAddon>
						<InputGroupInput
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Start typing to search"
						/>
					</InputGroup>

					<DropdownMenu>
						<DropdownMenuTrigger>
							<Button variant={typeFilter === 'all' ? 'outline' : 'secondary'} size="lg">
								<Filter className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuRadioGroup
								value={typeFilter}
								onValueChange={(value) => setTypeFilter(value as FileTypeFilter)}
							>
								{FILE_TYPE_FILTERS.map(({ value, label }) => (
									<DropdownMenuRadioItem key={value} value={value}>
										{label}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>

					<ButtonGroup>
						<Button
							variant={viewMode === 'list' ? 'secondary' : 'outline'}
							size="lg"
							onClick={() => setViewMode('list')}
							aria-label="List view"
							aria-pressed={viewMode === 'list'}
						>
							<List className="h-4 w-4" />
						</Button>
						<Button
							variant={viewMode === 'grid' ? 'secondary' : 'outline'}
							size="lg"
							onClick={() => setViewMode('grid')}
							aria-label="Grid view"
							aria-pressed={viewMode === 'grid'}
						>
							<Grid3x3 className="h-4 w-4" />
						</Button>
					</ButtonGroup>
				</ButtonGroup>
			</div>

			<div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
				{isLoading && (
					<div className="flex flex-1 items-center justify-center py-16">
						<p className="text-sm text-muted-foreground">Loading files...</p>
					</div>
				)}

				{!isLoading && entries.length === 0 && (
					<EmptyState uploading={uploading} onUpload={handleUpload} />
				)}

				{!isLoading && entries.length > 0 && viewMode === 'list' && (
					<AppTable>
						<AppTableHeader sticky>
							<AppTableRow>
								<AppTableHead className="w-10 px-6">
									<AppCheckbox
										checked={someChecked ? undefined : allChecked}
										indeterminate={someChecked}
										onCheckedChange={handleToggleAll}
										aria-label="Select all"
									/>
								</AppTableHead>
								{(
									[
										{ key: 'name', label: 'Name', className: '' },
										{ key: 'createdAt', label: 'Added', className: 'whitespace-nowrap' },
										{ key: 'mimeType', label: 'Type', className: '' },
										{
											key: 'size',
											label: 'File size',
											className: 'text-right',
										},
									] as { key: SortKey; label: string; className: string }[]
								).map(({ key, label, className }) => (
									<AppTableHead key={key} className={className}>
										<button
											type="button"
											className="inline-flex items-center transition-colors hover:text-foreground"
											onClick={() => handleSort(key)}
										>
											{label}
											<SortIcon active={sortKey === key} direction={sortDirection} />
										</button>
									</AppTableHead>
								))}
							</AppTableRow>
						</AppTableHeader>
						<AppTableBody>
							{filteredEntries.length === 0 ? (
								<AppTableRow>
									<AppTableCell
										colSpan={5}
										className="px-4 py-8 text-center text-sm text-muted-foreground"
									>
										No files match your search.
									</AppTableCell>
								</AppTableRow>
							) : (
								filteredEntries.map((file) => (
									<AppTableRow
										key={file.id}
										data-state={selected.has(file.id) ? 'selected' : undefined}
									>
										<AppTableCell className="w-10 px-6">
											<AppCheckbox
												checked={selected.has(file.id)}
												onCheckedChange={() => handleToggleRow(file.id)}
												aria-label={`Select ${file.name}`}
											/>
										</AppTableCell>
										<AppTableCell>
											<div className="flex items-center gap-3">
												<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
													{getFileIcon(file.mimeType)}
												</div>
												<div className="min-w-0">
													<p className="truncate font-medium text-sm">{file.name}</p>
													<p
														className="truncate text-xs text-muted-foreground"
														title={formatDate(file.createdAt)}
													>
														{file.path}
													</p>
												</div>
											</div>
										</AppTableCell>
										<AppTableCell className="whitespace-nowrap text-muted-foreground">
											{formatShortDate(file.createdAt)}
										</AppTableCell>
										<AppTableCell className="whitespace-nowrap text-muted-foreground">
											{getMimeTypeLabel(file.mimeType)}
										</AppTableCell>
										<AppTableCell className="whitespace-nowrap text-right text-muted-foreground">
											{formatBytes(file.size)}
										</AppTableCell>
									</AppTableRow>
								))
							)}
						</AppTableBody>
					</AppTable>
				)}

				{!isLoading && entries.length > 0 && viewMode === 'grid' && (
					<div className="flex flex-1 items-center justify-center py-16">
						<p className="text-sm text-muted-foreground">Grid view coming soon.</p>
					</div>
				)}
			</div>

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
		</div>
	);
}
