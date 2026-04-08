import { memo, type ReactNode, type ReactElement } from 'react';
import { AppSidebar, AppSidebarInset } from '../AppSidebar';

interface AppSidebarLayoutProps {
	readonly sidebar: ReactNode;
	readonly children: ReactNode;
}

export const AppSidebarLayout = memo(function AppSidebarLayout({
	sidebar,
	children,
}: AppSidebarLayoutProps): ReactElement {
	return (
		<div className="flex flex-1 min-h-0 w-full">
			<AppSidebar collapsible="icon" className="border-r top-12 h-[calc(100svh-3rem)]">
				{sidebar}
			</AppSidebar>
			<AppSidebarInset className="flex flex-col flex-1 min-h-0 min-w-0">
				<main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">{children}</main>
			</AppSidebarInset>
		</div>
	);
});
