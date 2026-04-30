import { useState, type ReactElement } from 'react';
import { FolderOpen, Upload } from 'lucide-react';
import { TextDialog } from './components/TextDialog';
import { ImageDialog } from './components/ImageDialog';
import { PdfDialog } from './components/PdfDialog';
import { DeleteConfirmDialog, ImagePreviewDialog } from '@/components/app/dialogs';
import { useContext } from './hooks/use-context';
import { PageBody, PageContainer, PageHeader, PageHeaderTitle } from '@/components/app/base/page';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import Layout from './Layout';
import type { FileTypeFilter } from '../../../../../shared/types';

function toLocalResourceUrl(filePath: string): string {
	const normalized = filePath.replace(/\\/g, '/');
	const withSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
	const encoded = withSlash
		.split('/')
		.map((segment) => encodeURIComponent(segment))
		.join('/');
	return `local-resource://localhost${encoded}`;
}

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
		filteredEntries,
		uploading,
		typeFilter,
		handleUpload,
		handleOpenFolder,
		selected,
		confirmOpen,
		setConfirmOpen,
		handleConfirmDelete,
	} = useContext();

	const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);

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
			<PageBody>
				{filteredEntries.length === 0 ? (
					<div className="flex flex-1 items-center justify-center py-16">
						<p className="text-sm text-muted-foreground">No images yet.</p>
					</div>
				) : (
					<div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
						{filteredEntries.map((image) => {
							const src = toLocalResourceUrl(image.path);
							return (
								<img
									key={image.id}
									className="aspect-square w-full cursor-pointer rounded-lg object-cover object-center"
									src={src}
									alt={image.name}
									title={image.name}
									onClick={() => setPreview({ src, alt: image.name })}
								/>
							);
						})}
					</div>
				)}
			</PageBody>

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
			<ImagePreviewDialog
				open={preview !== null}
				onOpenChange={(open) => {
					if (!open) setPreview(null);
				}}
				src={preview?.src ?? null}
				alt={preview?.alt ?? null}
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
