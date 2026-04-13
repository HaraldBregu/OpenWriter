import { memo, type ReactNode, type ReactElement } from 'react';

interface SidebarContainerProps {
	readonly children: ReactNode;
}

export const SidebarContainer = memo(function SidebarContainer({
	children,
}: SidebarContainerProps): ReactElement {
	return <div className="flex flex-1 min-h-0 w-full">{children}</div>;
});
