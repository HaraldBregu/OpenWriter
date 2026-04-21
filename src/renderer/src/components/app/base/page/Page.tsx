import React, { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PageProvider, usePage, type PageSidebarSide } from './PageContext';

interface PageContainerProps {
	readonly children: ReactNode;
	readonly className?: string;
	readonly defaultSidebarVisible?: boolean;
	readonly defaultSidebarSide?: PageSidebarSide;
	readonly defaultHeaderVisible?: boolean;
}

export const PageContainer = memo(function PageContainer({
	children,
	className,
	defaultSidebarVisible,
	defaultSidebarSide,
	defaultHeaderVisible,
}: PageContainerProps): React.ReactElement {
	return (
		<PageProvider
			defaultSidebarVisible={defaultSidebarVisible}
			defaultSidebarSide={defaultSidebarSide}
			defaultHeaderVisible={defaultHeaderVisible}
		>
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
		</PageProvider>
	);
});

interface PageHeaderProps {
	readonly children: ReactNode;
	readonly className?: string;
}

export const PageHeader = memo(function PageHeader({
	children,
	className,
}: PageHeaderProps): React.ReactElement | null {
	const { isHeaderVisible } = usePage();
	if (!isHeaderVisible) return null;
	return (
		<div
			className={cn(
				'flex shrink-0 items-center justify-between border-b px-6 py-2 gap-4',
				className
			)}
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
	return (
		<h1 className={cn('text-md font-medium flex items-center gap-3 flex-1 min-w-0', className)}>
			{children}
		</h1>
	);
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
	return (
		<div className={cn('flex shrink-0 items-center gap-4 border-b px-6 py-4', className)}>
			{children}
		</div>
	);
});

interface PageBodyProps {
	readonly children: ReactNode;
	readonly className?: string;
}

export const PageBody = memo(function PageBody({
	children,
	className,
}: PageBodyProps): React.ReactElement {
	return (
		<div className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto', className)}>{children}</div>
	);
});

interface PageSidebarProps {
	readonly children: ReactNode;
	readonly className?: string;
}

export const PageSidebar = memo(function PageSidebar({
	children,
	className,
}: PageSidebarProps): React.ReactElement | null {
	const { isSidebarVisible, sidebarSide } = usePage();
	if (!isSidebarVisible) return null;
	return (
		<aside
			className={cn(
				'flex shrink-0 flex-col overflow-y-auto',
				sidebarSide === 'left' ? 'order-first border-r' : 'order-last border-l',
				className
			)}
		>
			{children}
		</aside>
	);
});

interface PageSidebarInsetProps {
	readonly children: ReactNode;
	readonly className?: string;
}

export const PageSidebarInset = memo(function PageSidebarInset({
	children,
	className,
}: PageSidebarInsetProps): React.ReactElement {
	return (
		<div className={cn('flex min-w-0 flex-1 flex-col overflow-y-auto', className)}>{children}</div>
	);
});
