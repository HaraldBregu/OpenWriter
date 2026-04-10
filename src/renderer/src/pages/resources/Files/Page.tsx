import { useEffect, type ReactElement } from 'react';
import { FilesHeader } from './components/FilesHeader';
import { FilesToolbar } from './components/FilesToolbar';
import { FilesContent } from './components/FilesContent';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { FilesProvider, useFilesContext } from './context/FilesContext';

function FilesPageBootstrap(): null {
	const { loadFiles } = useFilesContext();

	useEffect(() => {
		void loadFiles();
	}, [loadFiles]);

	return null;
}

export default function FilesPage(): ReactElement {
	return (
		<FilesProvider>
			<FilesPageBootstrap />
			<div className="flex h-full flex-col">
				<FilesHeader />
				<FilesToolbar />
				<FilesContent />
				<DeleteConfirmDialog />
			</div>
		</FilesProvider>
	);
}
