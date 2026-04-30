import type { ColumnDef } from '@tanstack/react-table';
import { Eye, FolderOpen, MoreHorizontal, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import type { FileEntry } from '../../../../../../shared/types';
import { formatBytes } from '../../shared/resource-utils';
import { formatShortDate, getMimeTypeLabel } from '../shared/file-utils';
import { getFileIcon } from './FileIcon';
import { DataTableColumnHeader } from './DataTableColumnHeader';

interface ColumnsOptions {
	onPreview: (file: FileEntry) => void;
	onOpenInFinder: () => void;
	onDelete: (id: string) => void;
}

export function buildColumns({
	onPreview,
	onOpenInFinder,
	onDelete,
}: ColumnsOptions): ColumnDef<FileEntry>[] {
	return [
		{
			id: 'select',
			header: ({ table }) => {
				const allSelected = table.getIsAllPageRowsSelected();
				const someSelected = table.getIsSomePageRowsSelected();
				return (
					<Checkbox
						checked={allSelected}
						indeterminate={!allSelected && someSelected}
						onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
						aria-label="Select all"
					/>
				);
			},
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
				/>
			),
			enableSorting: false,
			enableHiding: false,
		},
		{
			accessorKey: 'name',
			header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
			cell: ({ row }) => {
				const file = row.original;
				return (
					<div className="flex items-center gap-3">
						{getFileIcon(file.mimeType)}
						<p className="truncate font-medium text-sm">{file.name}</p>
					</div>
				);
			},
		},
		{
			accessorKey: 'createdAt',
			header: ({ column }) => <DataTableColumnHeader column={column} title="Added" />,
			cell: ({ row }) => (
				<span className="whitespace-nowrap text-muted-foreground">
					{formatShortDate(row.getValue('createdAt'))}
				</span>
			),
		},
		{
			accessorKey: 'mimeType',
			header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
			cell: ({ row }) => (
				<span className="whitespace-nowrap text-muted-foreground">
					{getMimeTypeLabel(row.getValue('mimeType'))}
				</span>
			),
		},
		{
			accessorKey: 'size',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Size" className="justify-end" />
			),
			cell: ({ row }) => (
				<div className="text-right text-muted-foreground">
					{formatBytes(row.getValue('size'))}
				</div>
			),
		},
		{
			id: 'actions',
			enableHiding: false,
			cell: ({ row }) => {
				const file = row.original;
				return (
					<div className="flex justify-end">
						<DropdownMenu>
							<DropdownMenuTrigger
								render={<Button variant="ghost" size="icon" className="h-8 w-8 p-0" />}
							>
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuGroup>
									<DropdownMenuLabel>Actions</DropdownMenuLabel>
									<DropdownMenuItem onClick={() => onPreview(file)}>
										<Eye className="mr-2 h-4 w-4" />
										Preview
									</DropdownMenuItem>
									<DropdownMenuItem onClick={onOpenInFinder}>
										<FolderOpen className="mr-2 h-4 w-4" />
										Open in Finder
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() => onDelete(file.id)}
										className="text-destructive focus:text-destructive"
									>
										<Trash2 className="mr-2 h-4 w-4" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		},
	];
}
