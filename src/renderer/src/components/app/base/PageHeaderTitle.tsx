import { memo, type ReactNode } from 'react';

interface PageHeaderTitleProps {
	readonly children: ReactNode;
}

export const PageHeaderTitle = memo(function PageHeaderTitle({
	children,
}: PageHeaderTitleProps): React.ReactElement {
	return <h1 className="text-xl font-bold">{children}</h1>;
});
