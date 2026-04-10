import { File, FileImage, FileText } from 'lucide-react';
import type { KeyboardEvent, ReactElement, ReactNode } from 'react';
import { Checkbox } from '@/components/ui/Checkbox';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/Table';
import type { FileEntry } from '../../../../../../shared/types';
import type { SortKey } from '../types';
import {
	MIME_PREFIX_IMAGE,
	MIME_TYPE_JSON,
	MIME_TYPE_PDF,
} from '../../shared/resource-preview-utils';
import { formatBytes, formatDate } from '../../shared/resource-utils';
import { useFilesContext } from '../context/FilesContext';
import { SortIcon } from './SortIcon';

function getMimeTypeLabel(mimeType: string): string {
	if (mimeType.startsWith(MIME_PREFIX_IMAGE)) return 'Image';
	if (mimeType === MIME_TYPE_PDF) return 'PDF';
	if (mimeType === MIME_TYPE_JSON) return 'JSON';
	return 'File';
}

function getFileIcon(mimeType: string): ReactNode {
	if (mimeType.startsWith(MIME_PREFIX_IMAGE)) {
		return <FileImage className="h-5 w-5 text-muted-foreground" />;
	}
	if (mimeType === MIME_TYPE_PDF || mimeType === MIME_TYPE_JSON) {
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

const SORT_COLUMNS: { key: SortKey; label: string; className: string }[] = [
	{ key: 'name', label: 'Name', className: 'w-auto' },
	{ key: 'createdAt', label: 'Added', className: 'w-28 whitespace-nowrap' },
	{ key: 'mimeType', label: 'Type', className: 'w-28' },
	{ key: 'size', label: 'File size', className: 'w-28 text-right' },
];

export function FilesTable(): ReactElement {
	const {
		filteredEntries,
		selected,
		allChecked,
		someChecked,
		sortKey,
		sortDirection,
		editMode,
		handleSort,
		handleToggleAll,
		handleToggleRow,
		handleOpenFileDetails,
	} = useFilesContext();

	const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, file: FileEntry) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleOpenFileDetails(file);
		}
	};

	return (
		<Table className="table-fixed text-foreground">
			<TableHeader className="bg-muted sticky top-0 z-10">
				<TableRow>
					<TableHead className="w-12 px-6 text-muted-foreground">
						<Checkbox
							checked={someChecked ? undefined : allChecked}
							indeterminate={someChecked}
							onCheckedChange={handleToggleAll}
							aria-label="Select all"
						/>
					</TableHead>
					{SORT_COLUMNS.map(({ key, label, className }) => (
						<TableHead key={key} className={`px-6 text-muted-foreground ${className}`}>
							<button
								type="button"
								className="inline-flex items-center transition-colors hover:text-foreground"
								onClick={() => handleSort(key)}
							>
								{label}
								<SortIcon active={sortKey === key} direction={sortDirection} />
							</button>
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{filteredEntries.length === 0 ? (
					<TableRow>
						<TableCell colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
							No files match your search.
						</TableCell>
					</TableRow>
				) : (
					filteredEntries.map((file) => (
						<TableRow
							key={file.id}
							className="cursor-pointer"
							data-state={selected.has(file.id) ? 'selected' : undefined}
							onClick={() => handleOpenFileDetails(file)}
							onKeyDown={(event) => handleRowKeyDown(event, file)}
							tabIndex={0}
						>
							<TableCell className="w-10 px-6">
								<Checkbox
									checked={selected.has(file.id)}
									onClick={(event) => event.stopPropagation()}
									onCheckedChange={() => handleToggleRow(file.id)}
									aria-label={`Select ${file.name}`}
								/>
							</TableCell>
							<TableCell className="px-6">
								<div className="flex items-center gap-3">
									{getFileIcon(file.mimeType)}
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
							</TableCell>
							<TableCell className="px-6 whitespace-nowrap text-muted-foreground">
								{formatShortDate(file.createdAt)}
							</TableCell>
							<TableCell className="px-6 whitespace-nowrap text-muted-foreground">
								{getMimeTypeLabel(file.mimeType)}
							</TableCell>
							<TableCell className="px-6 whitespace-nowrap text-right text-muted-foreground">
								{formatBytes(file.size)}
							</TableCell>
						</TableRow>
					))
				)}
			</TableBody>
		</Table>
	);
}
