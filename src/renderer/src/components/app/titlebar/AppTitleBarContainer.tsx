import { memo, type ReactNode, type ReactElement } from 'react';

interface AppTitleBarContainerProps {
	readonly children: ReactNode;
}

export const AppTitleBarContainer = memo(function AppTitleBarContainer({
	children,
}: AppTitleBarContainerProps): ReactElement {
	return <div className="flex flex-col h-full w-full">{children}</div>;
});
