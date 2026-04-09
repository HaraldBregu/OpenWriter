import { memo, type ReactNode } from 'react';

interface AppPageContainerProps {
	readonly children: ReactNode;
}

export const AppPageContainer = memo(function AppPageContainer({
	children,
}: AppPageContainerProps): React.ReactElement {
	return <div className="flex h-full flex-col">{children}</div>;
});
