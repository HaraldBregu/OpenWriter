import { memo, type ReactNode, type ReactElement } from 'react';
import { SidebarInset } from '@/components/ui/Sidebar';

interface SidebarInsetLayoutProps {
	readonly children: ReactNode;
}

export const SidebarInsetLayout = memo(function SidebarInsetLayout({
	children,
}: SidebarInsetLayoutProps): ReactElement {
	return (
		<SidebarInset className="flex flex-col flex-1 min-h-0 min-w-0">
			<main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">{children}</main>
		</SidebarInset>
	);
});
