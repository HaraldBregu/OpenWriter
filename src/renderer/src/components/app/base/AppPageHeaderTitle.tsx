import { memo, type ReactNode } from 'react';

interface AppPageHeaderTitleProps {
	readonly children: ReactNode;
}

export const AppPageHeaderTitle = memo(function AppPageHeaderTitle({
	children,
}: AppPageHeaderTitleProps): React.ReactElement {
	return <h1 className="text-xl font-bold">{children}</h1>;
});
