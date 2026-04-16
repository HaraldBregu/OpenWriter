import type { ReactElement, ReactNode } from 'react';
import { Provider } from './Provider';

interface LayoutProps {
	readonly children: ReactNode;
}

export default function Layout({ children }: LayoutProps): ReactElement {
	return (
		<Provider>
			{children}
		</Provider>
	);
}
