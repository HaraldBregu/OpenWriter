import { memo, type ReactNode } from 'react';

interface AppPageHeaderItemsProps {
	readonly children: ReactNode;
}

export const AppPageHeaderItems = memo(function AppPageHeaderItems({
	children,
}: AppPageHeaderItemsProps): React.ReactElement {
	return <div className="flex items-center gap-2">{children}</div>;
});
