import React, { memo, type ReactNode, type ReactElement } from 'react';
import { SidebarInset } from '@/components/ui/Sidebar';

interface SidebarProps {
	readonly children: ReactNode;
}

export const SidebarPageContainer = memo(function Sidebar({
	children,
}: SidebarProps): ReactElement {
	return (
		<div
			className="flex flex-1 min-h-0 w-full"
			style={
				{
					backgroundColor: 'var(--sidebar-background, hsl(var(--sidebar-background)))',
				} as React.CSSProperties
			}
		>
			{children}
		</div>
	);
});

interface SidebarInsetLayoutProps {
	readonly children: ReactNode;
}

export const SidebarPageInset = memo(function SidebarInsetLayout({
	children,
}: SidebarInsetLayoutProps): ReactElement {
	return (
		<SidebarInset className="flex flex-col flex-1 min-h-0 min-w-0">
			<main
				className="flex-1 overflow-y-auto overflow-x-hidden"
				style={
					{
						backgroundColor: 'var(--page-background, hsl(var(--background)))',
					} as React.CSSProperties
				}
			>
				{children}
			</main>
		</SidebarInset>
	);
});
