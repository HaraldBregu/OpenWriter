import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, FolderOpen, Settings2, Trash2, Upload, } from 'lucide-react';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, } from '@tanstack/react-table';
import { PageBody, PageContainer, PageHeader, PageHeaderTitle, } from '@/components/app/base/page';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/DropdownMenu';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/Table';
import { RESOURCE_SECTIONS } from '../shared/resource-sections';
import { DeleteConfirmDialog } from '@/components/app/dialogs';
import { useContentContext } from './Provider';
import { ExtractorDialog } from './components/ExtractorDialog';
import { MarkdownPreviewDialog } from './components/MarkdownPreviewDialog';
import { buildColumns } from './components/columns';
import Layout from './Layout';
import { Label } from '@/components/ui/Label';
function PageContent() {
    const { t } = useTranslation();
    const section = RESOURCE_SECTIONS.content;
    const [fileDialogOpen, setFileDialogOpen] = useState(false);
    const [previewItem, setPreviewItem] = useState(null);
    const [sorting, setSorting] = React.useState([]);
    const [columnFilters, setColumnFilters] = React.useState([]);
    const [columnVisibility, setColumnVisibility] = React.useState({});
    const [rowSelection, setRowSelection] = React.useState({});
    const { contents, filteredContents, isLoading, uploading, handleUpload, handleOpenResourcesFolder, handleDeleteOne, handleDeleteMany, selected, confirmOpen, setConfirmOpen, handleConfirmDelete, } = useContentContext();
    const hasContents = contents.length > 0;
    const columns = useMemo(() => buildColumns({
        onPreview: setPreviewItem,
        onOpenInFinder: handleOpenResourcesFolder,
        onDelete: handleDeleteOne,
    }), [handleOpenResourcesFolder, handleDeleteOne]);
    const table = useReactTable({
        data: filteredContents,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: { sorting, columnFilters, columnVisibility, rowSelection },
    });
    const handleConfirmDeleteAndReset = async () => {
        await handleConfirmDelete();
        setRowSelection({});
    };
    const handleExtractorRun = async (payload) => {
        const { filePath, modelId } = payload;
        if (!filePath || !modelId)
            return;
        const result = await window.task.submit({
            type: 'ocr',
            input: { url: filePath, modelId, inputType: 'url' },
            metadata: {},
        });
        if (!result.success) {
            console.error('[ContentPage] OCR submit failed:', result.error.message);
            return;
        }
        setFileDialogOpen(false);
    };
    return (_jsxs(PageContainer, { children: [_jsx(PageHeader, { children: _jsxs(PageHeaderTitle, { children: [_jsx(Label, { className: "w-full text-left text-sm font-medium", children: t(section.titleKey) }), _jsxs(DropdownMenu, { children: [_jsxs(DropdownMenuTrigger, { render: _jsx(Button, { variant: "outline", size: "md", title: "Upload", "aria-label": "Upload" }), children: [_jsx(Upload, { "aria-hidden": "true" }), _jsx("span", { children: "Upload" })] }), _jsx(DropdownMenuContent, { align: "end", children: _jsxs(DropdownMenuGroup, { children: [_jsxs(DropdownMenuItem, { onClick: () => handleUpload(['.md']), children: [_jsx(FileText, { className: "h-4 w-4" }), "Markdown"] }), _jsxs(DropdownMenuItem, { disabled: true, children: [_jsx(Upload, { className: "h-4 w-4" }), "File"] })] }) })] }), _jsxs(Button, { variant: "outline", size: "md", title: "Open folder", "aria-label": "Open folder", onClick: handleOpenResourcesFolder, children: [_jsx(FolderOpen, { "aria-hidden": "true" }), _jsx("span", { children: "Folder" })] })] }) }), _jsxs(PageBody, { children: [isLoading && (_jsx("div", { className: "flex flex-1 items-center justify-center py-16", children: _jsx("p", { className: "text-sm text-muted-foreground", children: t(section.loadingKey) }) })), !isLoading && !hasContents && (_jsxs("div", { className: "flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center", children: [_jsx("div", { className: "flex h-14 w-14 items-center justify-center rounded-full bg-muted", children: _jsx(FileText, { className: "h-7 w-7 text-muted-foreground" }) }), _jsx("div", { className: "space-y-1", children: _jsx("p", { className: "font-medium text-sm", children: t(section.emptyKey) }) }), _jsxs(Button, { onClick: () => handleUpload(['.md']), disabled: uploading, size: "sm", children: [_jsx(Upload, {}), t(section.uploadKey)] })] })), !isLoading && hasContents && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Input, { placeholder: "Filter by name...", value: table.getColumn('name')?.getFilterValue() ?? '', onChange: (event) => table.getColumn('name')?.setFilterValue(event.target.value), className: "max-w-sm" }), table.getFilteredSelectedRowModel().rows.length > 0 && (_jsxs(Button, { variant: "destructive", size: "sm", className: "h-8", onClick: () => handleDeleteMany(table
                                            .getFilteredSelectedRowModel()
                                            .rows.map((row) => row.original.id)), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete (", table.getFilteredSelectedRowModel().rows.length, ")"] })), _jsxs(DropdownMenu, { children: [_jsxs(DropdownMenuTrigger, { render: _jsx(Button, { variant: "outline", size: "sm", className: "ml-auto hidden h-8 lg:flex" }), children: [_jsx(Settings2, { className: "mr-2 h-4 w-4" }), "View"] }), _jsx(DropdownMenuContent, { align: "end", className: "w-[150px]", children: _jsxs(DropdownMenuGroup, { children: [_jsx(DropdownMenuLabel, { children: "Toggle columns" }), _jsx(DropdownMenuSeparator, {}), table
                                                            .getAllColumns()
                                                            .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
                                                            .map((column) => (_jsx(DropdownMenuCheckboxItem, { className: "capitalize", checked: column.getIsVisible(), onCheckedChange: (value) => column.toggleVisibility(!!value), children: column.id }, column.id)))] }) })] })] }), _jsx("div", { className: "overflow-hidden rounded-md border", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: table.getHeaderGroups().map((headerGroup) => (_jsx(TableRow, { children: headerGroup.headers.map((header) => (_jsx(TableHead, { children: header.isPlaceholder
                                                        ? null
                                                        : flexRender(header.column.columnDef.header, header.getContext()) }, header.id))) }, headerGroup.id))) }), _jsx(TableBody, { children: table.getRowModel().rows.length ? (table.getRowModel().rows.map((row) => (_jsx(TableRow, { "data-state": row.getIsSelected() ? 'selected' : undefined, children: row.getVisibleCells().map((cell) => (_jsx(TableCell, { children: flexRender(cell.column.columnDef.cell, cell.getContext()) }, cell.id))) }, row.id)))) : (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: columns.length, className: "h-24 text-center", children: "No results." }) })) })] }) }), _jsxs("div", { className: "flex items-center justify-between px-2 py-2", children: [_jsxs("div", { className: "flex-1 text-sm text-muted-foreground", children: [table.getFilteredSelectedRowModel().rows.length, " of", ' ', table.getFilteredRowModel().rows.length, " row(s) selected."] }), _jsxs("div", { className: "flex items-center space-x-6 lg:space-x-8", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("p", { className: "text-sm font-medium", children: "Rows per page" }), _jsxs(Select, { value: `${table.getState().pagination.pageSize}`, onValueChange: (value) => table.setPageSize(Number(value)), children: [_jsx(SelectTrigger, { className: "h-8 w-[70px]", children: _jsx(SelectValue, { placeholder: `${table.getState().pagination.pageSize}` }) }), _jsx(SelectContent, { side: "top", children: [10, 20, 25, 30, 40, 50].map((pageSize) => (_jsx(SelectItem, { value: `${pageSize}`, children: pageSize }, pageSize))) })] })] }), _jsxs("div", { className: "flex w-[100px] items-center justify-center text-sm font-medium", children: ["Page ", table.getState().pagination.pageIndex + 1, " of", ' ', table.getPageCount()] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs(Button, { variant: "outline", size: "icon", className: "hidden size-8 lg:flex", onClick: () => table.setPageIndex(0), disabled: !table.getCanPreviousPage(), children: [_jsx("span", { className: "sr-only", children: "Go to first page" }), _jsx(ChevronsLeft, { className: "h-4 w-4" })] }), _jsxs(Button, { variant: "outline", size: "icon", className: "size-8", onClick: () => table.previousPage(), disabled: !table.getCanPreviousPage(), children: [_jsx("span", { className: "sr-only", children: "Go to previous page" }), _jsx(ChevronLeft, { className: "h-4 w-4" })] }), _jsxs(Button, { variant: "outline", size: "icon", className: "size-8", onClick: () => table.nextPage(), disabled: !table.getCanNextPage(), children: [_jsx("span", { className: "sr-only", children: "Go to next page" }), _jsx(ChevronRight, { className: "h-4 w-4" })] }), _jsxs(Button, { variant: "outline", size: "icon", className: "hidden size-8 lg:flex", onClick: () => table.setPageIndex(table.getPageCount() - 1), disabled: !table.getCanNextPage(), children: [_jsx("span", { className: "sr-only", children: "Go to last page" }), _jsx(ChevronsRight, { className: "h-4 w-4" })] })] })] })] })] }))] }), _jsx(DeleteConfirmDialog, { open: confirmOpen, onOpenChange: setConfirmOpen, title: t('resources.removeItems'), description: t('resources.removeConfirm', { count: selected.size }), onConfirm: handleConfirmDeleteAndReset, confirmLabel: t('resources.remove') }), _jsx(ExtractorDialog, { open: fileDialogOpen, onOpenChange: setFileDialogOpen, onRun: handleExtractorRun }), _jsx(MarkdownPreviewDialog, { item: previewItem, open: previewItem !== null, onOpenChange: (open) => {
                    if (!open)
                        setPreviewItem(null);
                } })] }));
}
export default function Page() {
    return (_jsx(Layout, { children: _jsx(PageContent, {}) }));
}
