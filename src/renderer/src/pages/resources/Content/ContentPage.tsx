import type { ReactElement } from 'react';
import { ContentProvider } from './context/ContentContext';
import { ContentHeader } from './components/ContentHeader';
import { ContentToolbar } from './components/ContentToolbar';
import { ContentContent } from './components/ContentContent';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';

export default function ContentPage(): ReactElement {
	return (
		<ContentProvider>
			<div className="flex h-full flex-col">
				<ContentHeader />
				<ContentToolbar />
				<ContentContent />
				<DeleteConfirmDialog />
			</div>
		</ContentProvider>
	);
}
