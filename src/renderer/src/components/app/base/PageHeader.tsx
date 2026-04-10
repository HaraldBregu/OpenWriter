import { memo, type ReactNode } from 'react';

interface PageHeaderProps {
	readonly children: ReactNode;
}

export const PageHeader = memo(function PageHeader({
	children,
}: PageHeaderProps): React.ReactElement {
	return (
		<div className="flex shrink-0 items-center justify-between border-b px-6 py-4">{children}</div>
	);
});
