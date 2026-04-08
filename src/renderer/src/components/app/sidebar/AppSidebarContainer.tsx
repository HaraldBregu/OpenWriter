import { memo, type ReactNode, type ReactElement } from 'react';

interface AppSidebarContainerProps {
	readonly children: ReactNode;
}

export const AppSidebarContainer = memo(function AppSidebarContainer({
	children,
}: AppSidebarContainerProps): ReactElement {
	return <div className="flex flex-1 min-h-0 w-full">{children}</div>;
});
