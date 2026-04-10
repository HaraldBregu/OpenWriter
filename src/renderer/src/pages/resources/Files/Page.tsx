import type { ReactElement } from 'react';
import { FilesToolbar } from './components/FilesToolbar';
import { FilesContent } from './components/FilesContent';
import { FileDetailsDialog } from './components/FileDetailsDialog';
import { ImageDialog } from './components/ImageDialog';
import { PdfDialog } from './components/PdfDialog';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { useFilesContext } from './context/FilesContext';
import { FolderOpen, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { PageHeader } from '@/components/app/base/Page';
import { Button } from '@/components/ui/Button';
import FilesLayout from './Layout';

function FilesPageContent(): ReactElement {
	const { selected, uploading, editMode, toggleEditMode, handleDelete, handleOpenFolder, handleUpload } =
		useFilesContext();

	return (
		<div className="flex h-full flex-col">
			<PageHeader>
				<h1 className="text-xl font-bold">Files</h1>
				<div className="flex items-center gap-2">
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
				</div>
			</PageHeader>

			<FilesToolbar />
			<FilesContent />
			<ImageDialog />
			<PdfDialog />
			<FileDetailsDialog />
			<DeleteConfirmDialog />
		</div>
	);
}

export default function FilesPage(): ReactElement {
	return (
		<FilesLayout>
			<FilesPageContent />
		</FilesLayout>
	);
}
