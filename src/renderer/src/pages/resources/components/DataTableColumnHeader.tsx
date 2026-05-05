import * as React from 'react';
import type { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

interface DataTableColumnHeaderProps<TData, TValue>
	extends React.HTMLAttributes<HTMLDivElement> {
	column: Column<TData, TValue>;
	title: string;
}

export function DataTableColumnHeader<TData, TValue>({
	column,
	title,
	className,
}: DataTableColumnHeaderProps<TData, TValue>) {
	if (!column.getCanSort()) {
		return <div className={cn(className)}>{title}</div>;
	}

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="ghost"
							size="sm"
							className="-ml-3 h-8 data-[popup-open]:bg-accent"
						/>
					}
				>
					<span>{title}</span>
					{column.getIsSorted() === 'desc' ? (
						<ArrowDown className="ml-1 h-4 w-4" />
					) : column.getIsSorted() === 'asc' ? (
						<ArrowUp className="ml-1 h-4 w-4" />
					) : (
						<ChevronsUpDown className="ml-1 h-4 w-4" />
					)}
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={() => column.toggleSorting(false)}>
							<ArrowUp className="mr-2 h-4 w-4" />
							Asc
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => column.toggleSorting(true)}>
							<ArrowDown className="mr-2 h-4 w-4" />
							Desc
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
							<EyeOff className="mr-2 h-4 w-4" />
							Hide
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
