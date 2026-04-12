import type { KeyboardEvent, ReactElement } from 'react';
import { Checkbox } from '@/components/ui/Checkbox';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/Table';
import type { FileEntry, ResourcesFilesSortKey as SortKey } from '../../../../../../shared/types';
import { formatBytes, formatDate } from '../../shared/resource-utils';
import { useContext } from '../hooks/use-context';
import { formatShortDate, getMimeTypeLabel } from '../shared/file-utils';
import { getFileIcon } from './FileIcon';
import { SortIcon } from './SortIcon';

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
	} = useContext();

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
					{editMode && (
						<TableHead className="w-12 px-6 text-muted-foreground">
							<Checkbox
								checked={someChecked ? undefined : allChecked}
								indeterminate={someChecked}
								onCheckedChange={handleToggleAll}
								aria-label="Select all"
							/>
						</TableHead>
					)}
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
						<TableCell
							colSpan={editMode ? 5 : 4}
							className="px-6 py-8 text-center text-sm text-muted-foreground"
						>
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
							{editMode && (
								<TableCell className="w-10 px-6">
									<Checkbox
										checked={selected.has(file.id)}
										onClick={(event) => event.stopPropagation()}
										onCheckedChange={() => handleToggleRow(file.id)}
										aria-label={`Select ${file.name}`}
									/>
								</TableCell>
							)}
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
