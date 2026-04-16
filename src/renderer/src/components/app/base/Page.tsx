import React, { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
	readonly children: ReactNode;
	readonly className?: string;
}

export const PageContainer = memo(function PageContainer({
	children,
	className,
}: PageContainerProps): React.ReactElement {
	return (
		<div
			className={cn('flex h-full flex-col', className)}
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
	readonly className?: string;
}

export const PageHeader = memo(function PageHeader({
	children,
	className,
}: PageHeaderProps): React.ReactElement {
	return (
		<div
			className={cn('flex shrink-0 items-center justify-between border-b px-6 py-2 gap-4', className)}
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
	readonly className?: string;
}

export const PageHeaderTitle = memo(function PageHeaderTitle({
	children,
	className,
}: PageHeaderTitleProps): React.ReactElement {
	return <h1 className={cn('text-md font-medium flex items-center gap-3 flex-1 min-w-0', className)}>{children}</h1>;
});

interface PageHeaderItemsProps {
	readonly children: ReactNode;
	readonly className?: string;
}

export const PageHeaderItems = memo(function PageHeaderItems({
	children,
	className,
}: PageHeaderItemsProps): React.ReactElement {
	return <div className={cn('flex items-center gap-2', className)}>{children}</div>;
});

interface PageSubHeaderProps {
	readonly children: ReactNode;
	readonly className?: string;
}

export const PageSubHeader = memo(function PageSubHeader({
	children,
	className,
}: PageSubHeaderProps): React.ReactElement {
	return <div className={cn('flex shrink-0 items-center gap-4 border-b px-6 py-4', className)}>{children}</div>;
});

interface PageBodyProps {
	readonly children: ReactNode;
	readonly className?: string;
}

export const PageBody = memo(function PageBody({ children, className }: PageBodyProps): React.ReactElement {
	return <div className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto', className)}>{children}</div>;
});
