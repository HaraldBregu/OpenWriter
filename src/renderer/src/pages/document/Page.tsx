import React from 'react';
import { useParams } from 'react-router-dom';
import { DocumentProvider, EditorInstanceProvider, SidebarVisibilityProvider } from './providers';
import { Layout } from './Layout';

const Page: React.FC = () => {
	const { id } = useParams<{ id: string }>();

	return (
		<DocumentProvider key={id} documentId={id}>
			<SidebarVisibilityProvider>
				<EditorInstanceProvider>
					<Layout documentId={id} />
				</EditorInstanceProvider>
			</SidebarVisibilityProvider>
		</DocumentProvider>
	);
};

export default Page;
