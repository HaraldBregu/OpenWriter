import type { ReactElement, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Provider } from './Provider';

interface LayoutProps {
	readonly children: ReactNode;
}

export default function Layout({ children }: LayoutProps): ReactElement {
	const { id } = useParams<{ id: string }>();

	return (
		<Provider key={id} documentId={id}>
			{children}
		</Provider>
	);
}
