import { useEffect, type ReactElement } from 'react';
import { FilesHeader } from './components/FilesHeader';
import { FilesToolbar } from './components/FilesToolbar';
import { FilesContent } from './components/FilesContent';
import { FileDetailsDialog } from './components/FileDetailsDialog';
import { ImageDialog } from './components/ImageDialog';
import { PdfDialog } from './components/PdfDialog';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { FilesProvider, useFilesContext } from './context/FilesContext';
import { MIME_PREFIX_IMAGE, MIME_TYPE_PDF } from '../shared/resource-preview-utils';

function FilesPageBootstrap(): null {
	const { setEntries, setIsLoading } = useFilesContext();

	useEffect(() => {
		let active = true;

		const loadFiles = async (): Promise<void> => {
			setIsLoading(true);
			try {
				const files = await window.workspace.getFiles();
				if (!active) return;
				setEntries(files);
			} catch (err) {
				if (!active) return;
				console.error('Failed to load files:', err);
				setEntries([]);
			} finally {
				if (active) {
					setIsLoading(false);
				}
			}
		};

		void loadFiles();

		return () => {
			active = false;
		};
	}, [setEntries, setIsLoading]);

	return null;
}

function FileDialog(): ReactElement | null {
	const { activeFile, fileDetailsOpen, handleFileDetailsOpenChange } = useFilesContext();

	if (!activeFile) return null;

	if (activeFile.mimeType.startsWith(MIME_PREFIX_IMAGE)) {
		return (
			<ImageDialog
				file={activeFile}
				open={fileDetailsOpen}
				onOpenChange={handleFileDetailsOpenChange}
			/>
		);
	}

	if (activeFile.mimeType === MIME_TYPE_PDF) {
		return (
			<PdfDialog
				file={activeFile}
				open={fileDetailsOpen}
				onOpenChange={handleFileDetailsOpenChange}
			/>
		);
	}

	return <FileDetailsDialog />;
}

export default function FilesPage(): ReactElement {
	return (
		<FilesProvider>
			<FilesPageBootstrap />
			<div className="flex h-full flex-col">
				<FilesHeader />
				<FilesToolbar />
				<FilesContent />
				<FileDialog />
				<DeleteConfirmDialog />
			</div>
		</FilesProvider>
	);
}
