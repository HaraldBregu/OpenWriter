import React, { memo, type ReactNode } from 'react';

interface PageContainerProps {
	readonly children: ReactNode;
}

export const PageContainer = memo(function PageContainer({
	children,
}: PageContainerProps): React.ReactElement {
	return (
		<div
			className="flex h-full flex-col"
			style={
				{
					backgroundColor: 'var(--page-background, hsl(var(--background)))',
				} as React.CSSProperties
			}
		>
			{children}
		</div>
	);
});

interface PageHeaderProps {
	readonly children: ReactNode;
}

export const PageHeader = memo(function PageHeader({
	children,
}: PageHeaderProps): React.ReactElement {
	return (
		<div
			className="flex shrink-0 items-center justify-between border-b px-6 py-4 gap-3"
			style={
				{
					backgroundColor: 'var(--page-header-background)',
				} as React.CSSProperties
			}
		>
			{children}
		</div>
	);
});

interface PageHeaderTitleProps {
	readonly children: ReactNode;
}

export const PageHeaderTitle = memo(function PageHeaderTitle({
	children,
}: PageHeaderTitleProps): React.ReactElement {
	return <h1 className="text-xl font-bold flex items-center gap-3 flex-1 min-w-0">{children}</h1>;
});

interface PageHeaderItemsProps {
	readonly children: ReactNode;
}

export const PageHeaderItems = memo(function PageHeaderItems({
	children,
}: PageHeaderItemsProps): React.ReactElement {
	return <div className="flex items-center gap-2">{children}</div>;
});

interface PageSubHeaderProps {
	readonly children: ReactNode;
}

export const PageSubHeader = memo(function PageSubHeader({
	children,
}: PageSubHeaderProps): React.ReactElement {
	return <div className="flex shrink-0 items-center gap-4 border-b px-6 py-4">{children}</div>;
});

interface PageBodyProps {
	readonly children: ReactNode;
}

export const PageBody = memo(function PageBody({ children }: PageBodyProps): React.ReactElement {
	return <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>;
});
