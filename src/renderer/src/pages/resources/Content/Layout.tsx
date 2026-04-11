import type { ReactElement, ReactNode } from 'react';
import { ContentProvider } from './context/ContentContext';

interface LayoutProps {
	readonly children: ReactNode;
}

export default function Layout({ children }: LayoutProps): ReactElement {
	return <ContentProvider>{children}</ContentProvider>;
}
