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

const UNSPLASH = (id: string, w = 1200): string =>
	`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const gallerySections = [
	{
		images: [
			{
				src: UNSPLASH('1500530855697-b586d89ba3ee', 1600),
				alt: 'Coastal cliffs and ocean view',
			},
		],
	},
	{
		type: 'grid',
		images: [
			{ src: UNSPLASH('1507525428034-b723cf961d3e'), alt: 'Silhouettes on beach' },
			{ src: UNSPLASH('1519681393784-d120267933ba'), alt: 'Snowy mountain peaks' },
			{ src: UNSPLASH('1501785888041-af3ef285b470'), alt: 'Rolling green hills' },
			{ src: UNSPLASH('1470770841072-f978cf4d019e'), alt: 'Sunset landscape' },
		],
	},
	{
		type: 'grid',
		images: [
			{ src: UNSPLASH('1496947850313-7743325fa58c'), alt: 'Silhouettes on beach' },
			{ src: UNSPLASH('1464822759023-fed622ff2c3b'), alt: 'Snowy mountain peaks' },
			{ src: UNSPLASH('1500382017468-9049fed747ef'), alt: 'Rolling green hills' },
			{ src: UNSPLASH('1472214103451-9374bd1c798e'), alt: 'Sunset landscape' },
		],
	},
	{
		images: [
			{
				src: UNSPLASH('1518791841217-8f162f1e1131', 1600),
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

			<Gallery sections={gallerySections} />

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
