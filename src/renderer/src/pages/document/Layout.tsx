import type { ReactElement, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { DocumentProvider, EditorInstanceProvider, SidebarVisibilityProvider } from './providers';

interface LayoutProps {
	readonly children: ReactNode;
}

export default function Layout({ children }: LayoutProps): ReactElement {
	const { id } = useParams<{ id: string }>();

	return (
		<DocumentProvider key={id} documentId={id}>
			<SidebarVisibilityProvider>
				<EditorInstanceProvider>
					{children}
				</EditorInstanceProvider>
			</SidebarVisibilityProvider>
		</DocumentProvider>
	);
}
