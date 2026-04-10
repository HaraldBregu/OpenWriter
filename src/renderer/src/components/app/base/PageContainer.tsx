import { memo, type ReactNode } from 'react';

interface PageContainerProps {
	readonly children: ReactNode;
}

export const PageContainer = memo(function PageContainer({
	children,
}: PageContainerProps): React.ReactElement {
	return <div className="flex h-full flex-col">{children}</div>;
});
