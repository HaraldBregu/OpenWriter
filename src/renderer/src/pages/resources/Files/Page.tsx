import type { ReactElement } from 'react';
import { TextDialog } from './components/TextDialog';
import { ImageDialog } from './components/ImageDialog';
import { PdfDialog } from './components/PdfDialog';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { useFilesContext } from './hooks/use-context';
import {
	ChevronDownIcon,
	Filter,
	FolderOpen,
	Grid3x3,
	List,
	Pencil,
	Plus,
	Search,
	Trash2,
	Upload,
	X,
	File,
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
import Layout from './Layout';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
} from '@/components/ui/DropdownMenu';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupText,
	InputGroupInput,
	InputGroupButton,
} from '@/components/ui/InputGroup';
import { FilesTable } from './components/FilesTable';
import { RESOURCES_FILE_TYPE_FILTERS, ResourcesFileTypeFilter } from 'src/shared';

function PageContent(): ReactElement {
	const {
		selected,
		uploading,
		editMode,
		toggleEditMode,
		handleDelete,
		handleOpenFolder,
		handleUpload,
		searchQuery,
		setSearchQuery,
		viewMode,
		setViewMode,
		typeFilter,
		setTypeFilter,
		entries,
		isLoading,
	} = useFilesContext();

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>Files</PageHeaderTitle>
				<PageHeaderItems>
					{editMode && selected.size > 0 && (
						<Button variant="destructive" size="lg" onClick={handleDelete}>
							<Trash2 />
							Delete ({selected.size})
						</Button>
					)}
					{!editMode && (
						<>
							<Button variant="outline" size="lg" onClick={handleOpenFolder}>
								<FolderOpen />
							</Button>
							<Button variant="outline" size="lg" disabled>
								<Plus />
								New folder
							</Button>
							<Button size="lg" onClick={handleUpload} disabled={uploading}>
								<Upload />
								Upload
							</Button>
						</>
					)}
					<Button variant="outline" size="lg" onClick={toggleEditMode}>
						{editMode ? (
							<>
								<X />
								Done
							</>
						) : (
							<>
								<Pencil />
								Edit
							</>
						)}
					</Button>
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
							placeholder="Start typing to search"
						/>
						<InputGroupAddon align="inline-end">
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<InputGroupButton variant="ghost" className="pr-1.5! text-xs">
											Filter <ChevronDownIcon className="size-3" />
										</InputGroupButton>
									}
								>
									<Filter className="h-4 w-4" />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" sideOffset={8} alignOffset={-4}>
									<DropdownMenuRadioGroup
										value={typeFilter}
										onValueChange={(value) => setTypeFilter(value as ResourcesFileTypeFilter)}
									>
										{RESOURCES_FILE_TYPE_FILTERS.map(({ value, label }) => (
											<DropdownMenuRadioItem key={value} value={value}>
												{label}
											</DropdownMenuRadioItem>
										))}
									</DropdownMenuRadioGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						</InputGroupAddon>
					</InputGroup>
				</ButtonGroup>
				<ButtonGroup className="shrink-0">
					<Button
						variant={viewMode === 'list' ? 'outline-selected' : 'outline'}
						size="icon"
						onClick={() => setViewMode('list')}
						aria-label="List view"
						aria-pressed={viewMode === 'list'}
					>
						<List className="h-4 w-4" />
					</Button>
					<Button
						variant={viewMode === 'grid' ? 'outline-selected' : 'outline'}
						size="icon"
						onClick={() => setViewMode('grid')}
						aria-label="Grid view"
						aria-pressed={viewMode === 'grid'}
					>
						<Grid3x3 className="h-4 w-4" />
					</Button>
				</ButtonGroup>
			</PageSubHeader>
			<PageBody>
				{isLoading && (
					<div className="flex flex-1 items-center justify-center py-16">
						<p className="text-sm text-muted-foreground">Loading files...</p>
					</div>
				)}

				{!isLoading && entries.length === 0 && (
					<div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
						<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
							<File className="h-7 w-7 text-muted-foreground" />
						</div>
						<div className="space-y-1">
							<p className="font-medium text-sm">No files yet</p>
							<p className="text-sm text-muted-foreground">Upload files to get started</p>
						</div>
						<Button onClick={handleUpload} disabled={uploading} size="sm">
							<Upload />
							Upload files
						</Button>
					</div>
				)}

				{!isLoading && entries.length > 0 && viewMode === 'list' && <FilesTable />}

				{!isLoading && entries.length > 0 && viewMode === 'grid' && (
					<div className="flex flex-1 items-center justify-center py-16">
						<p className="text-sm text-muted-foreground">Grid view coming soon.</p>
					</div>
				)}
			</PageBody>

			{/* Dialogs */}
			<ImageDialog />
			<PdfDialog />
			<TextDialog />
			<DeleteConfirmDialog />
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
