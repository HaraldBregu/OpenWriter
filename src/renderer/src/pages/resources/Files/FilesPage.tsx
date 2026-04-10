import type { ReactElement } from 'react';
import { FilesProvider } from './context/FilesContext';
import { FilesHeader } from './components/FilesHeader';
import { FilesToolbar } from './components/FilesToolbar';
import { FilesContent } from './components/FilesContent';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';

export default function FilesPage(): ReactElement {
	return (
		<FilesProvider>
			<div className="flex h-full flex-col">
				<FilesHeader />
				<FilesToolbar />
				<FilesContent />
				<DeleteConfirmDialog />
			</div>
		</FilesProvider>
	);
}
