import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Eye, FileText, FolderOpen, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/DropdownMenu';
import { DataTableColumnHeader } from './DataTableColumnHeader';
function formatShortDate(timestamp) {
    return new Date(timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}
export function buildColumns({ onPreview, onOpenInFinder, onDelete, }) {
    return [
        {
            id: 'select',
            header: ({ table }) => {
                const allSelected = table.getIsAllPageRowsSelected();
                const someSelected = table.getIsSomePageRowsSelected();
                return (_jsx(Checkbox, { checked: allSelected, indeterminate: !allSelected && someSelected, onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value), "aria-label": "Select all" }));
            },
            cell: ({ row }) => (_jsx(Checkbox, { checked: row.getIsSelected(), onCheckedChange: (value) => row.toggleSelected(!!value), "aria-label": "Select row" })),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'name',
            header: ({ column }) => _jsx(DataTableColumnHeader, { column: column, title: "Name" }),
            cell: ({ row }) => {
                const item = row.original;
                return (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(FileText, { className: "h-5 w-5 text-muted-foreground" }), _jsx("p", { className: "truncate font-medium text-sm", children: item.name })] }));
            },
        },
        {
            accessorKey: 'importedAt',
            header: ({ column }) => _jsx(DataTableColumnHeader, { column: column, title: "Imported" }),
            cell: ({ row }) => (_jsx("span", { className: "whitespace-nowrap text-muted-foreground", children: formatShortDate(row.getValue('importedAt')) })),
        },
        {
            accessorKey: 'lastModified',
            header: ({ column }) => _jsx(DataTableColumnHeader, { column: column, title: "Modified" }),
            cell: ({ row }) => (_jsx("span", { className: "whitespace-nowrap text-muted-foreground", children: formatShortDate(row.getValue('lastModified')) })),
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => {
                const item = row.original;
                return (_jsx("div", { className: "flex justify-end", children: _jsxs(DropdownMenu, { children: [_jsxs(DropdownMenuTrigger, { render: _jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 p-0" }), children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreHorizontal, { className: "h-4 w-4" })] }), _jsx(DropdownMenuContent, { align: "end", children: _jsxs(DropdownMenuGroup, { children: [_jsx(DropdownMenuLabel, { children: "Actions" }), _jsxs(DropdownMenuItem, { onClick: () => onPreview(item), children: [_jsx(Eye, { className: "mr-2 h-4 w-4" }), "Preview"] }), _jsxs(DropdownMenuItem, { onClick: onOpenInFinder, children: [_jsx(FolderOpen, { className: "mr-2 h-4 w-4" }), "Open in Finder"] }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuItem, { onClick: () => onDelete(item.id), className: "text-destructive focus:text-destructive", children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete"] })] }) })] }) }));
            },
        },
    ];
}
