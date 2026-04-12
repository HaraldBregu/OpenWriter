import type { ReactElement, ReactNode } from 'react';
import { DataProvider } from './Provider';

interface LayoutProps {
	readonly children: ReactNode;
}

export default function Layout({ children }: LayoutProps): ReactElement {
	return <DataProvider>{children}</DataProvider>;
}
