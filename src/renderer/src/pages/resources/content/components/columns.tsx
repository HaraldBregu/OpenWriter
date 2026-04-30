import type { ColumnDef } from '@tanstack/react-table';
import { Eye, FileText, FolderOpen, MoreHorizontal, Trash2 } from 'lucide-react';

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
import type { ResourceInfo } from '../../../../../../shared/types';
import { DataTableColumnHeader } from './DataTableColumnHeader';

function formatShortDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
	});
}

interface ColumnsOptions {
	onPreview: (item: ResourceInfo) => void;
	onOpenInFinder: () => void;
	onDelete: (id: string) => void;
}

export function buildColumns({
	onPreview,
	onOpenInFinder,
	onDelete,
}: ColumnsOptions): ColumnDef<ResourceInfo>[] {
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
				const item = row.original;
				return (
					<div className="flex items-center gap-3">
						<FileText className="h-5 w-5 text-muted-foreground" />
						<div className="min-w-0 flex-1">
							<p className="truncate font-medium text-sm">{item.name}</p>
							<p className="truncate text-xs text-muted-foreground">{item.path}</p>
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: 'importedAt',
			header: ({ column }) => <DataTableColumnHeader column={column} title="Imported" />,
			cell: ({ row }) => (
				<span className="whitespace-nowrap text-muted-foreground">
					{formatShortDate(row.getValue('importedAt'))}
				</span>
			),
		},
		{
			accessorKey: 'lastModified',
			header: ({ column }) => <DataTableColumnHeader column={column} title="Modified" />,
			cell: ({ row }) => (
				<span className="whitespace-nowrap text-muted-foreground">
					{formatShortDate(row.getValue('lastModified'))}
				</span>
			),
		},
		{
			id: 'actions',
			enableHiding: false,
			cell: ({ row }) => {
				const item = row.original;
				return (
					<div className="inline-flex items-center justify-end gap-1">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => onPreview(item)}
							aria-label="Preview"
						>
							<Eye className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={onOpenInFinder}
							aria-label="Open in Finder"
						>
							<FolderOpen className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="text-destructive hover:text-destructive"
							onClick={() => onDelete(item.id)}
							aria-label="Delete"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				);
			},
		},
	];
}
