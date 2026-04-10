import { FolderOpen, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/Button';
import { useFilesContext } from '../context/FilesContext';

export function FilesHeader(): ReactElement {
	const { selected, uploading, editMode, toggleEditMode, handleDelete, handleOpenFolder, handleUpload } =
		useFilesContext();

	return (
		<div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
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
				<Button variant={editMode ? 'outline' : 'outline'} size="lg" onClick={toggleEditMode}>
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
		</div>
	);
}
