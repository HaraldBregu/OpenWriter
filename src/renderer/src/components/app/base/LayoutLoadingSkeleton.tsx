import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	SidebarProvider,
} from '@/components/ui/Sidebar';
import { TitleBarContainer } from '../titlebar/TitleBarContainer';
import { TitleBarLeftContainer } from '../titlebar/TitleBarLeftContainer';
import { TitleBarCenterContainer } from '../titlebar/TitleBarCenterContainer';
import { SidebarPageContainer, SidebarPageInset } from '../sidebar/Sidebar';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderItems,
	PageHeaderTitle,
} from './Page';

const SIDEBAR_NAV_ITEMS = 2;
const SIDEBAR_GROUP_ITEMS = 4;
const SIDEBAR_GROUP_COUNT = 2;

function SidebarRowSkeleton() {
	return (
		<div className="flex items-center gap-2 px-3 h-9">
			<Skeleton className="size-5 rounded" />
			<Skeleton className="h-3.5 flex-1" />
		</div>
	);
}

export const LayoutLoadingSkeleton = React.memo(function LayoutLoadingSkeleton() {
	return (
		<SidebarProvider
			className="flex-col flex-1 min-h-0 flex h-screen min-w-200 overflow-x-hidden"
			style={{ '--sidebar-width': '18rem' } as React.CSSProperties}
		>
			{/* Titlebar */}
			<TitleBarContainer>
				<TitleBarLeftContainer isMac={false} isFullScreen={false}>
					<div className="flex items-center gap-2 px-3 h-full">
						<Skeleton className="size-5 rounded" />
						<Skeleton className="size-5 rounded" />
						<Skeleton className="size-5 rounded" />
					</div>
				</TitleBarLeftContainer>
				<TitleBarCenterContainer>
					<Skeleton className="h-4 w-40" />
				</TitleBarCenterContainer>
				<div className="flex-1" />
			</TitleBarContainer>

			<SidebarPageContainer>
				<Sidebar collapsible="icon" className="top-12 h-[calc(100svh-3rem)]">
					{/* Header */}
					<SidebarHeader>
						<SidebarMenu>
							<SidebarMenuItem>
								<div className="flex items-center gap-2 p-2">
									<Skeleton className="size-8 rounded-lg" />
									<div className="flex-1 space-y-1.5">
										<Skeleton className="h-3.5 w-24" />
										<Skeleton className="h-3 w-16" />
									</div>
									<Skeleton className="size-4 rounded" />
								</div>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarHeader>

					{/* Content */}
					<SidebarContent className="gap-4 py-2">
						<SidebarGroup className="py-0">
							<SidebarGroupContent>
								<SidebarMenu>
									{Array.from({ length: SIDEBAR_NAV_ITEMS }).map((_, i) => (
										<SidebarMenuItem key={`nav-${i}`}>
											<SidebarRowSkeleton />
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>

						{Array.from({ length: SIDEBAR_GROUP_COUNT }).map((_, gi) => (
							<SidebarGroup key={`grp-${gi}`} className="py-0">
								<SidebarGroupLabel>
									<Skeleton className="h-3 w-20" />
								</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										{Array.from({ length: SIDEBAR_GROUP_ITEMS }).map((_, i) => (
											<SidebarMenuItem key={`grp-${gi}-item-${i}`}>
												<SidebarRowSkeleton />
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						))}
					</SidebarContent>

					{/* Footer */}
					<SidebarFooter className="border-t p-2">
						<SidebarMenu>
							<SidebarMenuItem>
								<div className="flex items-center gap-2 p-1">
									<Skeleton className="size-8 rounded-lg" />
									<div className="flex-1 space-y-1.5">
										<Skeleton className="h-3.5 w-20" />
										<Skeleton className="h-3 w-28" />
									</div>
									<Skeleton className="size-4 rounded" />
								</div>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarFooter>
				</Sidebar>

				{/* Main content */}
				<SidebarPageInset>
					<PageContainer>
						<PageHeader>
							<PageHeaderTitle>
								<Skeleton className="h-6 w-48" />
							</PageHeaderTitle>
							<PageHeaderItems>
								<Skeleton className="h-8 w-20 rounded-md" />
								<Skeleton className="h-8 w-8 rounded-md" />
							</PageHeaderItems>
						</PageHeader>
						<PageBody className="p-6">
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
						</PageBody>
					</PageContainer>
				</SidebarPageInset>
			</SidebarPageContainer>
		</SidebarProvider>
	);
});
LayoutLoadingSkeleton.displayName = 'LayoutLoadingSkeleton';
