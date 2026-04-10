import type { ReactElement } from 'react';
import { AppPageContainer } from '@/components/app';
import { ContentProvider } from './context/ContentContext';
import { ContentHeader } from './components/ContentHeader';
import { ContentToolbar } from './components/ContentToolbar';
import { ContentContent } from './components/ContentContent';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';

export default function ContentPage(): ReactElement {
	return (
		<ContentProvider>
			<AppPageContainer>
				<ContentHeader />
				<ContentToolbar />
				<ContentContent />
				<DeleteConfirmDialog />
			</AppPageContainer>
		</ContentProvider>
	);
}
