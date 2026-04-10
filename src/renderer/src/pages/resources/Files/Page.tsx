import type { ReactElement } from 'react';
import { FilesContent } from './components/FilesContent';
import { FileDetailsDialog } from './components/FileDetailsDialog';
import { ImageDialog } from './components/ImageDialog';
import { PdfDialog } from './components/PdfDialog';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { useFilesContext } from './context/FilesContext';
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
} from 'lucide-react';
import {
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
import { FileTypeFilter, FILE_TYPE_FILTERS } from './types';

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
										onValueChange={(value) => setTypeFilter(value as FileTypeFilter)}
									>
										{FILE_TYPE_FILTERS.map(({ value, label }) => (
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
			<FilesContent />

			
			{/* Dialogs */}
			<ImageDialog />
			<PdfDialog />
			<FileDetailsDialog />
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
