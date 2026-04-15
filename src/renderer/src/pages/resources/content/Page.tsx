import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
	ChevronDown,
	Eye,
	FileText,
	Folder as FolderIcon,
	FolderOpen,
	MoreHorizontal,
	Search,
	Trash2,
	Upload,
} from 'lucide-react';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderItems,
	PageHeaderTitle,
	PageSubHeader,
} from '@/components/app/base/Page';
import { Button } from '@/components/ui/Button';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Input } from '@/components/ui/Input';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from '@/components/ui/InputGroup';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/Table';
import { formatDate } from '../shared/resource-utils';
import { RESOURCE_SECTIONS } from '../shared/resource-sections';
import { useContentContext } from './Provider';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { ExtractorDialog, type ExtractorRunPayload } from './components/ExtractorDialog';
import { MarkdownPreviewDialog } from './components/MarkdownPreviewDialog';
import { SortIcon } from './components/SortIcon';
import type { SortKey } from './shared/types';
import type { FolderEntry } from '../../../../../shared/types';
import Layout from './Layout';

const SORT_COLUMNS: { key: SortKey; label: string; className: string }[] = [
	{ key: 'name', label: 'Name', className: 'w-auto' },
	{ key: 'createdAt', label: 'Created', className: 'w-32 whitespace-nowrap' },
	{ key: 'modifiedAt', label: 'Modified', className: 'w-32 whitespace-nowrap' },
];

function formatShortDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
	});
}

function PageContent(): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.content;
	const [fileDialogOpen, setFileDialogOpen] = useState(false);
	const [previewFolder, setPreviewFolder] = useState<FolderEntry | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState('');
	const {
		folders,
		filteredFolders,
		isLoading,
		uploading,
		sortKey,
		sortDirection,
		handleSort,
		searchQuery,
		setSearchQuery,
		handleUpload,
		handleOpenResourcesFolder,
		handleDeleteOne,
		refreshFolders,
	} = useContentContext();

	const splitName = (folder: FolderEntry): { base: string; ext: string } => {
		if (folder.kind !== 'file') return { base: folder.name, ext: '' };
		const dot = folder.name.lastIndexOf('.');
		if (dot <= 0) return { base: folder.name, ext: '' };
		return { base: folder.name.slice(0, dot), ext: folder.name.slice(dot) };
	};

	const startEditing = (folder: FolderEntry): void => {
		setEditingId(folder.id);
		setEditingName(splitName(folder).base);
	};

	const cancelEditing = (): void => {
		setEditingId(null);
		setEditingName('');
	};

	const commitRename = async (folder: FolderEntry): Promise<void> => {
		const { base, ext } = splitName(folder);
		const nextBase = editingName.trim();
		if (!nextBase || nextBase === base) {
			cancelEditing();
			return;
		}
		const nextName = `${nextBase}${ext}`;
		const lastSep = Math.max(folder.path.lastIndexOf('/'), folder.path.lastIndexOf('\\'));
		const dir = folder.path.slice(0, lastSep);
		const sep = folder.path.charAt(lastSep);
		const newPath = `${dir}${sep}${nextName}`;
		try {
			await window.workspace.rename({ oldPath: folder.path, newPath });
			await refreshFolders();
		} catch (err) {
			console.error('[ContentPage] Rename failed:', err);
		} finally {
			cancelEditing();
		}
	};

	const handleExtractorRun = async (payload: ExtractorRunPayload): Promise<void> => {
		console.log('[ContentPage] Extractor run triggered with file:', payload);

		const { filePath, modelId } = payload;
		if (!filePath || !modelId) return;
		const result = await window.task.submit('ocr', {
			url: filePath,
			modelId,
			inputType: 'url',
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
				<PageHeaderTitle>{t(section.titleKey)}</PageHeaderTitle>
				<PageHeaderItems>
					<Button variant="outline" size="lg" onClick={handleOpenResourcesFolder}>
						<FolderOpen />
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger render={<Button size="lg" />} className="gap-1.5">
							<Upload />
							Upload
							<ChevronDown className="h-3.5 w-3.5 opacity-50" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => handleUpload(['.md'])}>
								<FileText className="h-4 w-4" />
								Markdown
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setFileDialogOpen(true)}>
								<Upload className="h-4 w-4" />
								File
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</PageHeaderItems>
			</PageHeader>
			<PageSubHeader>
				<ButtonGroup className="min-w-0 flex-1">
					<InputGroup>
						<InputGroupAddon>
							<InputGroupText>
								<Search />
							</InputGroupText>
						</InputGroupAddon>
						<InputGroupInput
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder={t(section.searchPlaceholderKey)}
						/>
					</InputGroup>
				</ButtonGroup>
			</PageSubHeader>
			<PageBody>
				{isLoading && (
					<div className="flex flex-1 items-center justify-center py-16">
						<p className="text-sm text-muted-foreground">{t(section.loadingKey)}</p>
					</div>
				)}

				{!isLoading && folders.length === 0 && (
					<div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
						<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
							<FileText className="h-7 w-7 text-muted-foreground" />
						</div>
						<div className="space-y-1">
							<p className="font-medium text-sm">{t(section.emptyKey)}</p>
						</div>
						<Button onClick={() => handleUpload()} disabled={uploading} size="sm">
							<Upload />
							{t(section.uploadKey)}
						</Button>
					</div>
				)}

				{!isLoading && folders.length > 0 && (
					<Table className="table-fixed text-foreground">
						<TableHeader className="bg-background sticky top-0 z-10">
							<TableRow>
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
								<TableHead className="w-40 px-6 text-muted-foreground" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredFolders.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={SORT_COLUMNS.length + 1}
										className="px-6 py-8 text-center text-sm text-muted-foreground"
									>
										No folders match your search.
									</TableCell>
								</TableRow>
							) : (
								filteredFolders.map((folder) => (
									<TableRow
										key={folder.id}
										className="cursor-pointer"
										onDoubleClick={() => startEditing(folder)}
									>
										<TableCell className="px-6">
											<div className="flex items-center gap-3">
												{folder.kind === 'file' ? (
													<FileText className="h-5 w-5 text-muted-foreground" />
												) : (
													<FolderIcon className="h-5 w-5 text-muted-foreground" />
												)}
												<div className="min-w-0 flex-1">
													{editingId === folder.id ? (
														<Input
															autoFocus
															value={editingName}
															onChange={(e) => setEditingName(e.target.value)}
															onClick={(e) => e.stopPropagation()}
															onBlur={() => void commitRename(folder)}
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	e.preventDefault();
																	void commitRename(folder);
																} else if (e.key === 'Escape') {
																	e.preventDefault();
																	cancelEditing();
																}
															}}
															className="h-8 text-sm"
														/>
													) : (
														<>
															<p className="truncate font-medium text-sm">{folder.name}</p>
															<p
																className="truncate text-xs text-muted-foreground"
																title={formatDate(folder.createdAt)}
															>
																{folder.path}
															</p>
														</>
													)}
												</div>
											</div>
										</TableCell>
										<TableCell className="px-6 whitespace-nowrap text-muted-foreground">
											{formatShortDate(folder.createdAt)}
										</TableCell>
										<TableCell className="px-6 whitespace-nowrap text-muted-foreground">
											{formatShortDate(folder.modifiedAt)}
										</TableCell>
										<TableCell
											className="px-6 text-right whitespace-nowrap"
											onClick={(event) => event.stopPropagation()}
											onDoubleClick={(event) => event.stopPropagation()}
										>
											<div className="inline-flex items-center gap-1">
												{folder.kind === 'file' && (
													<>
														{folder.name.toLowerCase().endsWith('.md') && (
															<Button
																variant="ghost"
																size="icon"
																onClick={() => setPreviewFolder(folder)}
																aria-label="Preview"
															>
																<Eye className="h-4 w-4" />
															</Button>
														)}
														<Button
															variant="ghost"
															size="icon"
															onClick={handleOpenResourcesFolder}
															aria-label="Open in Finder"
														>
															<FolderOpen className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="text-destructive hover:text-destructive"
															onClick={() => handleDeleteOne(folder.id)}
															aria-label="Delete"
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</>
												)}
												{folder.kind === 'folder' && (
													<DropdownMenu>
														<DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
															<MoreHorizontal className="h-4 w-4" />
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end" className="min-w-48">
															<DropdownMenuItem onClick={handleOpenResourcesFolder}>
																<FolderOpen className="h-4 w-4" />
																Open in Finder
															</DropdownMenuItem>
															<DropdownMenuItem
																className="text-destructive focus:text-destructive"
																onClick={() => handleDeleteOne(folder.id)}
															>
																<Trash2 className="h-4 w-4" />
																Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												)}
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				)}
			</PageBody>

			<DeleteConfirmDialog />
			<ExtractorDialog
				open={fileDialogOpen}
				onOpenChange={setFileDialogOpen}
				onRun={handleExtractorRun}
			/>
			<MarkdownPreviewDialog
				folder={previewFolder}
				open={previewFolder !== null}
				onOpenChange={(open) => {
					if (!open) setPreviewFolder(null);
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
