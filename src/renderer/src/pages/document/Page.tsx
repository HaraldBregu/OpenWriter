import React from 'react';
import { useParams } from 'react-router-dom';
import { DocumentProvider, EditorInstanceProvider, SidebarVisibilityProvider } from './context';
import { Layout } from './Layout';

const Page: React.FC = () => {
	const { id } = useParams<{ id: string }>();

	return (
		<DocumentProvider documentId={id}>
			<SidebarVisibilityProvider>
				<EditorInstanceProvider>
					<Layout documentId={id} />
				</EditorInstanceProvider>
			</SidebarVisibilityProvider>
		</DocumentProvider>
	);
};

export default Page;
