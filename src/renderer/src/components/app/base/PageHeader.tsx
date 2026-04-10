import { memo, type ReactNode } from 'react';

interface AppPageHeaderProps {
	readonly children: ReactNode;
}

export const AppPageHeader = memo(function AppPageHeader({
	children,
}: AppPageHeaderProps): React.ReactElement {
	return (
		<div className="flex shrink-0 items-center justify-between border-b px-6 py-4">{children}</div>
	);
});
