import type { ReactElement } from 'react';
import { FolderOpen, Upload } from 'lucide-react';
import { TextDialog } from './components/TextDialog';
import { ImageDialog } from './components/ImageDialog';
import { PdfDialog } from './components/PdfDialog';
import { DeleteConfirmDialog } from '@/components/app/dialogs';
import { useContext } from './hooks/use-context';
import { PageContainer, PageHeader, PageHeaderTitle } from '@/components/app/base/page';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import Layout from './Layout';
import type { FileTypeFilter } from 'src/shared';

const IMAGES = [
	'https://images.unsplash.com/photo-1574015974293-817f0ebebb74?auto=format&fit=crop&q=80&w=400&h=400',
	'https://images.unsplash.com/photo-1661327930345-9c6714b603b3?auto=format&fit=crop&q=80&w=400&h=400',
	'https://images.unsplash.com/photo-1578508637199-240a8f25eff6?auto=format&fit=crop&q=80&w=400&h=400',
	'https://images.unsplash.com/photo-1559745482-57bfa9ca5a8a?auto=format&fit=crop&q=80&w=400&h=400',
	'https://images.unsplash.com/photo-1737608734653-d1eaad541d46?auto=format&fit=crop&q=80&w=400&h=400',
	'https://images.unsplash.com/photo-1574015974293-817f0ebebb74?auto=format&fit=crop&q=80&w=400&h=400',
];

const PAGE_TITLES: Record<FileTypeFilter, string> = {
	all: 'Images',
	image: 'Images',
	video: 'Images',
	audio: 'Images',
	json: 'Images',
	markdown: 'Images',
	text: 'Images',
	pdf: 'Images',
};

function PageContent(): ReactElement {
	const {
		uploading,
		typeFilter,
		handleUpload,
		handleOpenFolder,
		selected,
		confirmOpen,
		setConfirmOpen,
		handleConfirmDelete,
	} = useContext();

	const pageTitle = PAGE_TITLES[typeFilter];
	const fileCount = selected.size;
	const fileDescription =
		fileCount === 1
			? 'This will permanently delete 1 file. This action cannot be undone.'
			: `This will permanently delete ${fileCount} files. This action cannot be undone.`;

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>
					<Label className="w-full text-left text-sm font-medium">{pageTitle}</Label>
					<Button
						variant="outline"
						size="md"
						onClick={handleUpload}
						disabled={uploading}
						aria-label="Upload"
						title="Upload"
					>
						<Upload aria-hidden="true" />
						<span>Upload</span>
					</Button>
					<Button
						variant="outline"
						size="md"
						onClick={handleOpenFolder}
						aria-label="Open folder"
						title="Open folder"
					>
						<FolderOpen aria-hidden="true" />
						<span>Folder</span>
					</Button>
				</PageHeaderTitle>
			</PageHeader>

			<div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-3">
				{IMAGES.map((imageLink, index) => (
					<img
						key={index}
						className="h-40 w-full max-w-full rounded-lg object-cover object-center"
						src={imageLink}
						alt={`image-photo-${index + 1}`}
					/>
				))}
			</div>

			<ImageDialog />
			<PdfDialog />
			<TextDialog />
			<DeleteConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Delete files"
				description={fileDescription}
				onConfirm={handleConfirmDelete}
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
