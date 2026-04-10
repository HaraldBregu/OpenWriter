import type { ReactElement } from 'react';
import { DataProvider } from './context/DataContext';
import { DataHeader } from './components/DataHeader';
import { DataIndexingBar } from './components/DataIndexingBar';
import { DataContent } from './components/DataContent';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';

export default function DataPage(): ReactElement {
	return (
		<DataProvider>
			<div className="flex h-full flex-col">
				<DataHeader />
				<DataIndexingBar />
				<DataContent />
				<DeleteConfirmDialog />
			</div>
		</DataProvider>
	);
}
