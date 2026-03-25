import React from 'react';
import { useParams } from 'react-router-dom';
import { DocumentProvider, EditorInstanceProvider, SidebarVisibilityProvider } from './context';
import { DocumentLayout } from './DocumentLayout';

const DocumentPage: React.FC = () => {
	const { id } = useParams<{ id: string }>();

	return (
		<DocumentProvider documentId={id}>
			<SidebarVisibilityProvider>
				<EditorInstanceProvider>
					<DocumentLayout documentId={id} />
				</EditorInstanceProvider>
			</SidebarVisibilityProvider>
		</DocumentProvider>
	);
};

export default DocumentPage;
