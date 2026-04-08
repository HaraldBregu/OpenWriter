import { memo, type ReactNode, type ReactElement } from 'react';
import { AppSidebar } from '../AppSidebar';

interface AppSidebarLayoutProps {
	readonly children: ReactNode;
}

export const AppSidebarLayout = memo(function AppSidebarLayout({
	children,
}: AppSidebarLayoutProps): ReactElement {
	return (
		<AppSidebar collapsible="icon" className="border-r top-12 h-[calc(100svh-3rem)]">
			{children}
		</AppSidebar>
	);
});
