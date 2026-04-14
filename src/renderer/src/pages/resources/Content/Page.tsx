import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
	ChevronDown,
	FileText,
	Folder as FolderIcon,
	FolderOpen,
	ImageIcon,
	MoreHorizontal,
	Music,
	Search,
	Trash2,
	Upload,
	Video,
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
import { useContentContext } from './context/ContentContext';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { ExtractorDialog } from './components/ExtractorDialog';
import { SortIcon } from './components/SortIcon';
import type { SortKey } from './types';
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
	const [imageDialogOpen, setImageDialogOpen] = useState(false);
	const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
	const {
		folders,
		filteredFolders,
		isLoading,
		uploading,
		sortKey,
		sortDirection,
		handleSort,
		handleToggleRow,
		searchQuery,
		setSearchQuery,
		handleUpload,
		handleOpenResourcesFolder,
		handleDelete,
	} = useContentContext();

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>{t(section.titleKey)}</PageHeaderTitle>
				<PageHeaderItems>
					<Button variant="outline" size="lg" onClick={handleOpenResourcesFolder}>
						<FolderOpen />
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={<Button size="lg" />}
							className="gap-1.5"
						>
							<Upload />
							Upload content from
							<ChevronDown className="h-3.5 w-3.5 opacity-50" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setImageDialogOpen(true)}>
								<ImageIcon className="h-4 w-4" />
								Image
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setPdfDialogOpen(true)}>
								<FileText className="h-4 w-4" />
								PDF
							</DropdownMenuItem>
							<DropdownMenuItem>
								<Video className="h-4 w-4" />
								Video
							</DropdownMenuItem>
							<DropdownMenuItem>
								<Music className="h-4 w-4" />
								Audio
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
						<Button onClick={handleUpload} disabled={uploading} size="sm">
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
								<TableHead className="w-16 px-6 text-muted-foreground" />
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
									<TableRow key={folder.id} className="cursor-pointer">
										<TableCell className="px-6">
											<div className="flex items-center gap-3">
												<FolderIcon className="h-5 w-5 text-muted-foreground" />
												<div className="min-w-0">
													<p className="truncate font-medium text-sm">{folder.name}</p>
													<p
														className="truncate text-xs text-muted-foreground"
														title={formatDate(folder.createdAt)}
													>
														{folder.path}
													</p>
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
											className="w-16 px-6 text-right"
											onClick={(event) => event.stopPropagation()}
										>
											<DropdownMenu>
												<DropdownMenuTrigger
													render={<Button variant="ghost" size="icon" />}
												>
													<MoreHorizontal className="h-4 w-4" />
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem onClick={handleOpenResourcesFolder}>
														<FolderOpen className="h-4 w-4" />
														Open in Finder
													</DropdownMenuItem>
													<DropdownMenuItem
														className="text-destructive focus:text-destructive"
														onClick={() => {
															handleToggleRow(folder.id);
															handleDelete();
														}}
													>
														<Trash2 className="h-4 w-4" />
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>

					</Table>
				)}
			</PageBody>

			<DeleteConfirmDialog />
			<ExtractorDialog type="image" open={imageDialogOpen} onOpenChange={setImageDialogOpen} />
			<ExtractorDialog type="pdf" open={pdfDialogOpen} onOpenChange={setPdfDialogOpen} />
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
