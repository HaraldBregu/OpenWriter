import { memo, type ReactNode } from 'react';

interface PageHeaderItemsProps {
	readonly children: ReactNode;
}

export const PageHeaderItems = memo(function PageHeaderItems({
	children,
}: PageHeaderItemsProps): React.ReactElement {
	return <div className="flex items-center gap-2">{children}</div>;
});
