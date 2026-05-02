import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/DropdownMenu';
export function DataTableColumnHeader({ column, title, className, }) {
    if (!column.getCanSort()) {
        return _jsx("div", { className: cn(className), children: title });
    }
    return (_jsx("div", { className: cn('flex items-center gap-2', className), children: _jsxs(DropdownMenu, { children: [_jsxs(DropdownMenuTrigger, { render: _jsx(Button, { variant: "ghost", size: "sm", className: "-ml-3 h-8 data-[popup-open]:bg-accent" }), children: [_jsx("span", { children: title }), column.getIsSorted() === 'desc' ? (_jsx(ArrowDown, { className: "ml-1 h-4 w-4" })) : column.getIsSorted() === 'asc' ? (_jsx(ArrowUp, { className: "ml-1 h-4 w-4" })) : (_jsx(ChevronsUpDown, { className: "ml-1 h-4 w-4" }))] }), _jsx(DropdownMenuContent, { align: "start", children: _jsxs(DropdownMenuGroup, { children: [_jsxs(DropdownMenuItem, { onClick: () => column.toggleSorting(false), children: [_jsx(ArrowUp, { className: "mr-2 h-4 w-4" }), "Asc"] }), _jsxs(DropdownMenuItem, { onClick: () => column.toggleSorting(true), children: [_jsx(ArrowDown, { className: "mr-2 h-4 w-4" }), "Desc"] }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuItem, { onClick: () => column.toggleVisibility(false), children: [_jsx(EyeOff, { className: "mr-2 h-4 w-4" }), "Hide"] })] }) })] }) }));
}
