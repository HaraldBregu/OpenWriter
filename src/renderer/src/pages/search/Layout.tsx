import type { ReactElement, ReactNode } from 'react';

interface LayoutProps {
	readonly children: ReactNode;
}

export default function Layout({ children }: LayoutProps): ReactElement {
	return <>{children}</>;
}
