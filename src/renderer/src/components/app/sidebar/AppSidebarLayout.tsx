import { memo, type ReactNode, type ReactElement } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';

interface SidebarLayoutProps {
	readonly children: ReactNode;
}

export const SidebarLayout = memo(function SidebarLayout({
	children,
}: SidebarLayoutProps): ReactElement {
	return (
		<Sidebar collapsible="icon" className="border-r top-12 h-[calc(100svh-3rem)]">
			{children}
		</Sidebar>
	);
});
