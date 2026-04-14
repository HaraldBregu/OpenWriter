import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageContainer, PageHeader, PageHeaderTitle, PageHeaderItems, PageBody } from './Page';

const SIDEBAR_NAV_ITEMS = 2;
const SIDEBAR_GROUP_ITEMS = 4;

export const LoadingSkeleton = React.memo(function LoadingSkeleton() {
	return (
		<div className="flex h-screen w-full flex-col overflow-hidden">
			{/* Navbar (titlebar) */}
			<div className="relative z-20 flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
				<Skeleton className="h-5 w-5 rounded" />
				<Skeleton className="h-5 w-5 rounded" />
				<div className="flex-1 flex justify-center">
					<Skeleton className="h-4 w-40" />
				</div>
				<Skeleton className="h-5 w-5 rounded" />
			</div>

			{/* Sidebar + main */}
			<div className="flex flex-1 min-h-0 w-full">
				{/* Sidebar */}
				<aside className="flex w-72 shrink-0 flex-col border-r border-border bg-sidebar">
					{/* Header */}
					<div className="flex items-center gap-2 p-2">
						<Skeleton className="size-8 rounded-lg" />
						<div className="flex-1 space-y-1.5">
							<Skeleton className="h-3.5 w-24" />
							<Skeleton className="h-3 w-16" />
						</div>
						<Skeleton className="size-4 rounded" />
					</div>

					{/* Nav items */}
					<div className="flex flex-col gap-1 p-2">
						{Array.from({ length: SIDEBAR_NAV_ITEMS }).map((_, i) => (
							<div key={i} className="flex items-center gap-2 px-3 h-9">
								<Skeleton className="size-5 rounded" />
								<Skeleton className="h-3.5 flex-1" />
							</div>
						))}
					</div>

					{/* Group */}
					<div className="flex flex-col gap-1 p-2">
						<Skeleton className="h-3 w-20 mx-3 my-1" />
						{Array.from({ length: SIDEBAR_GROUP_ITEMS }).map((_, i) => (
							<div key={i} className="flex items-center gap-2 px-3 h-9">
								<Skeleton className="size-5 rounded" />
								<Skeleton className="h-3.5 flex-1" />
							</div>
						))}
					</div>

					{/* Second group */}
					<div className="flex flex-col gap-1 p-2">
						<Skeleton className="h-3 w-24 mx-3 my-1" />
						{Array.from({ length: SIDEBAR_GROUP_ITEMS }).map((_, i) => (
							<div key={i} className="flex items-center gap-2 px-3 h-9">
								<Skeleton className="size-5 rounded" />
								<Skeleton className="h-3.5 flex-1" />
							</div>
						))}
					</div>

					{/* Footer */}
					<div className="mt-auto border-t border-border p-2">
						<div className="flex items-center gap-2 p-1">
							<Skeleton className="size-8 rounded-lg" />
							<div className="flex-1 space-y-1.5">
								<Skeleton className="h-3.5 w-20" />
								<Skeleton className="h-3 w-28" />
							</div>
							<Skeleton className="size-4 rounded" />
						</div>
					</div>
				</aside>

				{/* Main content */}
				<main className="flex-1 min-w-0 overflow-hidden p-6">
					<div className="flex flex-col gap-4 max-w-3xl">
						<Skeleton className="h-8 w-1/2" />
						<Skeleton className="h-4 w-2/3" />
						<div className="space-y-2 pt-4">
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-3 w-11/12" />
							<Skeleton className="h-3 w-10/12" />
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-3 w-9/12" />
						</div>
					</div>
				</main>
			</div>
		</div>
	);
});
LoadingSkeleton.displayName = 'LoadingSkeleton';
