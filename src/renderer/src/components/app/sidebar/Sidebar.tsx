import { memo, type ReactNode, type ReactElement } from 'react';

interface SidebarProps {
	readonly children: ReactNode;
}

export const Sidebar = memo(function Sidebar({
	children,
}: SidebarProps): ReactElement {
	return <div className="flex flex-1 min-h-0 w-full">{children}</div>;
});
