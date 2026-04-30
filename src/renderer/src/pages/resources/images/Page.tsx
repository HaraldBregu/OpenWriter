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

const DEMO_IMAGE =
	'https://images.unsplash.com/photo-1777026050794-a5e4ef7cd254?q=80&w=2671&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

const gallerySections = [
	{
		images: [{ src: DEMO_IMAGE, alt: 'Demo image' }],
	},
	{
		type: 'grid',
		images: [
			{ src: DEMO_IMAGE, alt: 'Demo image' },
			{ src: DEMO_IMAGE, alt: 'Demo image' },
			{ src: DEMO_IMAGE, alt: 'Demo image' },
			{ src: DEMO_IMAGE, alt: 'Demo image' },
		],
	},
	{
		type: 'grid',
		images: [
			{ src: DEMO_IMAGE, alt: 'Demo image' },
			{ src: DEMO_IMAGE, alt: 'Demo image' },
			{ src: DEMO_IMAGE, alt: 'Demo image' },
			{ src: DEMO_IMAGE, alt: 'Demo image' },
		],
	},
	{
		images: [{ src: DEMO_IMAGE, alt: 'Demo image' }],
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
