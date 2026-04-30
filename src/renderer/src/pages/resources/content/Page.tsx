import * as React from 'react';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	FileText,
	FolderOpen,
	Settings2,
	Upload,
} from 'lucide-react';
import {
	type ColumnFiltersState,
	type SortingState,
	type VisibilityState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderTitle,
} from '@/components/app/base/page';
import { Button } from '@/components/ui/Button';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Input } from '@/components/ui/Input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/Table';
import { RESOURCE_SECTIONS } from '../shared/resource-sections';
import { DeleteConfirmDialog } from '@/components/app/dialogs';
import { useContentContext } from './Provider';
import { ExtractorDialog, type ExtractorRunPayload } from './components/ExtractorDialog';
import { MarkdownPreviewDialog } from './components/MarkdownPreviewDialog';
import { buildColumns } from './components/columns';
import type { ResourceInfo } from '../../../../../shared/types';
import Layout from './Layout';
import { Label } from '@/components/ui/Label';

function PageContent(): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.content;
	const [fileDialogOpen, setFileDialogOpen] = useState(false);
	const [previewItem, setPreviewItem] = useState<ResourceInfo | null>(null);
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = React.useState({});
	const {
		contents,
		filteredContents,
		isLoading,
		uploading,
		handleUpload,
		handleOpenResourcesFolder,
		handleDeleteOne,
		selected,
		confirmOpen,
		setConfirmOpen,
		handleConfirmDelete,
	} = useContentContext();

	const hasContents = contents.length > 0;

	const columns = useMemo(
		() =>
			buildColumns({
				onPreview: setPreviewItem,
				onOpenInFinder: handleOpenResourcesFolder,
				onDelete: handleDeleteOne,
			}),
		[handleOpenResourcesFolder, handleDeleteOne],
	);

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

	const handleExtractorRun = async (payload: ExtractorRunPayload): Promise<void> => {
		const { filePath, modelId } = payload;
		if (!filePath || !modelId) return;
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

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>
					<Label className="w-full text-left text-sm font-medium">{t(section.titleKey)}</Label>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={<Button variant="outline" size="md" title="Upload" aria-label="Upload" />}
						>
							<Upload aria-hidden="true" />
							<span>Upload</span>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuGroup>
								<DropdownMenuItem onClick={() => handleUpload(['.md'])}>
									<FileText className="h-4 w-4" />
									Markdown
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setFileDialogOpen(true)}>
									<Upload className="h-4 w-4" />
									File
								</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
					<Button
						variant="outline"
						size="md"
						title="Open folder"
						aria-label="Open folder"
						onClick={handleOpenResourcesFolder}
					>
						<FolderOpen aria-hidden="true" />
						<span>Folder</span>
					</Button>
				</PageHeaderTitle>
			</PageHeader>
			<PageBody>
				{isLoading && (
					<div className="flex flex-1 items-center justify-center py-16">
						<p className="text-sm text-muted-foreground">{t(section.loadingKey)}</p>
					</div>
				)}

				{!isLoading && !hasContents && (
					<div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
						<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
							<FileText className="h-7 w-7 text-muted-foreground" />
						</div>
						<div className="space-y-1">
							<p className="font-medium text-sm">{t(section.emptyKey)}</p>
						</div>
						<Button onClick={() => handleUpload(['.md'])} disabled={uploading} size="sm">
							<Upload />
							{t(section.uploadKey)}
						</Button>
					</div>
				)}

				{!isLoading && hasContents && (
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<Input
								placeholder="Filter by name..."
								value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
								onChange={(event) =>
									table.getColumn('name')?.setFilterValue(event.target.value)
								}
								className="max-w-sm"
							/>
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											variant="outline"
											size="sm"
											className="ml-auto hidden h-8 lg:flex"
										/>
									}
								>
									<Settings2 className="mr-2 h-4 w-4" />
									View
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-[150px]">
									<DropdownMenuGroup>
										<DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
										<DropdownMenuSeparator />
										{table
											.getAllColumns()
											.filter(
												(column) =>
													typeof column.accessorFn !== 'undefined' && column.getCanHide(),
											)
											.map((column) => (
												<DropdownMenuCheckboxItem
													key={column.id}
													className="capitalize"
													checked={column.getIsVisible()}
													onCheckedChange={(value) => column.toggleVisibility(!!value)}
												>
													{column.id}
												</DropdownMenuCheckboxItem>
											))}
									</DropdownMenuGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
						<div className="overflow-hidden rounded-md border">
							<Table>
								<TableHeader>
									{table.getHeaderGroups().map((headerGroup) => (
										<TableRow key={headerGroup.id}>
											{headerGroup.headers.map((header) => (
												<TableHead key={header.id}>
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext(),
															)}
												</TableHead>
											))}
										</TableRow>
									))}
								</TableHeader>
								<TableBody>
									{table.getRowModel().rows.length ? (
										table.getRowModel().rows.map((row) => (
											<TableRow
												key={row.id}
												data-state={row.getIsSelected() ? 'selected' : undefined}
											>
												{row.getVisibleCells().map((cell) => (
													<TableCell key={cell.id}>
														{flexRender(cell.column.columnDef.cell, cell.getContext())}
													</TableCell>
												))}
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell colSpan={columns.length} className="h-24 text-center">
												No results.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>
						<div className="flex items-center justify-between px-2 py-2">
							<div className="flex-1 text-sm text-muted-foreground">
								{table.getFilteredSelectedRowModel().rows.length} of{' '}
								{table.getFilteredRowModel().rows.length} row(s) selected.
							</div>
							<div className="flex items-center space-x-6 lg:space-x-8">
								<div className="flex items-center space-x-2">
									<p className="text-sm font-medium">Rows per page</p>
									<Select<string>
										value={`${table.getState().pagination.pageSize}`}
										onValueChange={(value) => table.setPageSize(Number(value))}
									>
										<SelectTrigger className="h-8 w-[70px]">
											<SelectValue placeholder={`${table.getState().pagination.pageSize}`} />
										</SelectTrigger>
										<SelectContent side="top">
											{[10, 20, 25, 30, 40, 50].map((pageSize) => (
												<SelectItem key={pageSize} value={`${pageSize}`}>
													{pageSize}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="flex w-[100px] items-center justify-center text-sm font-medium">
									Page {table.getState().pagination.pageIndex + 1} of{' '}
									{table.getPageCount()}
								</div>
								<div className="flex items-center space-x-2">
									<Button
										variant="outline"
										size="icon"
										className="hidden size-8 lg:flex"
										onClick={() => table.setPageIndex(0)}
										disabled={!table.getCanPreviousPage()}
									>
										<span className="sr-only">Go to first page</span>
										<ChevronsLeft className="h-4 w-4" />
									</Button>
									<Button
										variant="outline"
										size="icon"
										className="size-8"
										onClick={() => table.previousPage()}
										disabled={!table.getCanPreviousPage()}
									>
										<span className="sr-only">Go to previous page</span>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									<Button
										variant="outline"
										size="icon"
										className="size-8"
										onClick={() => table.nextPage()}
										disabled={!table.getCanNextPage()}
									>
										<span className="sr-only">Go to next page</span>
										<ChevronRight className="h-4 w-4" />
									</Button>
									<Button
										variant="outline"
										size="icon"
										className="hidden size-8 lg:flex"
										onClick={() => table.setPageIndex(table.getPageCount() - 1)}
										disabled={!table.getCanNextPage()}
									>
										<span className="sr-only">Go to last page</span>
										<ChevronsRight className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</div>
					</div>
				)}
			</PageBody>

			<DeleteConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title={t('resources.removeItems')}
				description={t('resources.removeConfirm', { count: selected.size })}
				onConfirm={handleConfirmDelete}
				confirmLabel={t('resources.remove')}
			/>
			<ExtractorDialog
				open={fileDialogOpen}
				onOpenChange={setFileDialogOpen}
				onRun={handleExtractorRun}
			/>
			<MarkdownPreviewDialog
				item={previewItem}
				open={previewItem !== null}
				onOpenChange={(open) => {
					if (!open) setPreviewItem(null);
				}}
			/>
		</PageContainer>
	);
}

export default function Page(): ReactElement {
	return (
		<Layout>
			<PageContent />
		</Layout>
	);
}
