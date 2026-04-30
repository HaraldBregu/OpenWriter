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

const UNSPLASH_IDS = [
	'1574015974293-817f0ebebb74',
	'1661327930345-9c6714b603b3',
	'1578508637199-240a8f25eff6',
	'1559745482-57bfa9ca5a8a',
	'1737608734653-d1eaad541d46',
	'1500530855697-b586d89ba3ee',
	'1507525428034-b723cf961d3e',
	'1519681393784-d120267933ba',
	'1501785888041-af3ef285b470',
	'1470770841072-f978cf4d019e',
	'1496947850313-7743325fa58c',
	'1464822759023-fed622ff2c3b',
	'1500382017468-9049fed747ef',
	'1472214103451-9374bd1c798e',
	'1518791841217-8f162f1e1131',
	'1518770660439-4636190af475',
	'1521747116042-5a810fda9664',
	'1517816743773-6e0fd518b4a6',
	'1520975922131-d4a13e8b2d1f',
	'1517694712202-14dd9538aa97',
	'1515378791036-0648a3ef77b2',
	'1496181133206-80ce9b88a853',
	'1493612276216-ee3925520721',
	'1488590528505-98d2b5aba04b',
];

const IMAGES = UNSPLASH_IDS.map(
	(id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=400&h=400`,
);

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
