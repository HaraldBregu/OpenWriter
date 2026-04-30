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
import Gallery from '@/components/shadcn-studio/blocks/gallery-component-01/gallery-component-01';
import Layout from './Layout';
import type { FileTypeFilter } from 'src/shared';

const gallerySections = [
	{
		images: [
			{
				src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-10.png',
				alt: 'Coastal cliffs and ocean view',
			},
		],
	},
	{
		type: 'grid',
		images: [
			{
				src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-9.png',
				alt: 'Silhouettes on beach',
			},
			{
				src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-8.png',
				alt: 'Snowy mountain peaks',
			},
			{
				src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-7.png',
				alt: 'Rolling green hills',
			},
			{
				src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-6.png',
				alt: 'Sunset landscape',
			},
		],
	},
	{
		type: 'grid',
		images: [
			{
				src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-4.png',
				alt: 'Silhouettes on beach',
			},
			{
				src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-3.png',
				alt: 'Snowy mountain peaks',
			},
			{
				src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-2.png',
				alt: 'Rolling green hills',
			},
			{
				src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-1.png',
				alt: 'Sunset landscape',
			},
		],
	},
	{
		images: [
			{
				src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-5.png',
				alt: 'Coastal cliffs and ocean view',
			},
		],
	},
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
