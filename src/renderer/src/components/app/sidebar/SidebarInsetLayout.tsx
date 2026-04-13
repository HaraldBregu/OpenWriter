import { memo, type ReactNode, type ReactElement } from 'react';
import { SidebarInset } from '@/components/ui/Sidebar';

interface AppSidebarInsetLayoutProps {
	readonly children: ReactNode;
}

export const AppSidebarInsetLayout = memo(function AppSidebarInsetLayout({
	children,
}: AppSidebarInsetLayoutProps): ReactElement {
	return (
		<SidebarInset className="flex flex-col flex-1 min-h-0 min-w-0">
			<main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">{children}</main>
		</SidebarInset>
	);
});
