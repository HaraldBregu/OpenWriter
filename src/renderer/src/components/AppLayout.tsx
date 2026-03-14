import React, { useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/use-language';
import { useWorkspaceListener } from '../hooks/use-workspace-listener';
import { useWorkspaceValidation } from '../hooks/use-workspace-validation';
import { useCreateWriting } from '../hooks/use-create-writing';
import { useAppDispatch, useAppSelector } from '../store';
import { selectWorkspaceName } from '../store/workspace/selectors';
import { loadCurrentWorkspace } from '../store/workspace/actions';
import { selectAllWritings } from '../store/writings/selectors';
import { writingAdded } from '../store/writings/actions';
import { TitleBar } from './TitleBar';
import {
	AppCollapsible,
	AppCollapsibleTrigger,
	AppCollapsiblePanel,
	AppSidebar,
	AppSidebarContent,
	AppSidebarGroup,
	AppSidebarGroupContent,
	AppSidebarGroupLabel,
	AppSidebarMenu,
	AppSidebarMenuButton,
	AppSidebarMenuItem,
	AppSidebarSeparator,
	AppSidebarProvider,
	AppSidebarInset,
	AppSidebarHeader,
	useSidebar,
} from './app';
import logoIcon from '@resources/icons/icon.png';
import { Settings, ChevronRight, Bug, Plus, Library } from 'lucide-react';

interface AppLayoutProps {
	readonly children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// AppLayoutInner — rendered inside AppSidebarProvider so it can call useSidebar
// ---------------------------------------------------------------------------

function AppLayoutInner({ children }: AppLayoutProps) {
	const { t } = useTranslation();
	const { toggleSidebar } = useSidebar();
	const location = useLocation();
	const dispatch = useAppDispatch();
	const workspaceNameFromPath = useAppSelector(selectWorkspaceName);

	// Listen for workspace changes from main process and update Redux
	useWorkspaceListener();

	// Monitor workspace folder for external deletion and redirect to Welcome
	useWorkspaceValidation();

	// Load current workspace on mount
	useEffect(() => {
		dispatch(loadCurrentWorkspace());
	}, [dispatch]);

	// -------------------------------------------------------------------------
	// Writings list — sourced from Redux (loaded/watched at app startup)
	// -------------------------------------------------------------------------
	const writings = useAppSelector(selectAllWritings);

	// -------------------------------------------------------------------------
	// New writing handler — optimistic Redux update
	// -------------------------------------------------------------------------
	const handleWritingCreated = useCallback(
		(result: { id: string }) => {
			dispatch(
				writingAdded({
					id: result.id,
					title: '',
					path: '',
					createdAt: Date.now(),
					updatedAt: Date.now(),
				})
			);
		},
		[dispatch]
	);

	const { createWriting, isCreating: creatingWriting } = useCreateWriting({
		onCreated: handleWritingCreated,
	});

	const displayWorkspaceName = workspaceNameFromPath
		? `${workspaceNameFromPath} (workspace)`
		: 'OpenWriter';

	return (
		<>
			<TitleBar title={displayWorkspaceName} onToggleSidebar={toggleSidebar} />

			<div className="flex flex-1 min-h-0 w-full">
				<AppSidebar className="border-r top-12 h-[calc(100svh-3rem)]">
					{/* Header */}
					<AppSidebarHeader className="border-b p-4">
						<Link
							to="/home"
							className="flex items-center gap-2 hover:opacity-80 transition-opacity"
						>
							<img src={logoIcon} alt="OpenWriter" className="h-6 w-6 rounded-full object-cover" />
							<span className="text-md font-normal tracking-tight">OpenWriter</span>
						</Link>
					</AppSidebarHeader>

					{/* Nav */}
					<AppSidebarContent className="gap-0 py-2">
						{/* New Writing */}
						<AppSidebarGroup className="py-0">
							<AppSidebarGroupContent>
								<AppSidebarMenu>
									<AppSidebarMenuItem>
										<AppSidebarMenuButton
											className="h-9 px-3"
											onClick={createWriting}
											disabled={creatingWriting}
										>
											<Plus className="h-3.5 w-3.5 shrink-0" />
											<span className="flex-1 truncate">{t('sidebar.newWriting')}</span>
										</AppSidebarMenuButton>
									</AppSidebarMenuItem>
								</AppSidebarMenu>
							</AppSidebarGroupContent>
						</AppSidebarGroup>

						<AppSidebarSeparator className="my-1" />

						{/* Writings collapsible group */}
						<AppCollapsible defaultOpen className="py-0">
							<AppSidebarGroup className="py-0">
								<AppSidebarGroupLabel asChild>
									<AppCollapsibleTrigger className="group cursor-pointer select-none hover:text-sidebar-foreground transition-colors">
										{t('sidebar.writings')}
										<ChevronRight className="h-3 w-3 shrink-0 transition-transform duration-200 ml-auto mr-1 group-data-[panel-open]:rotate-90" />
									</AppCollapsibleTrigger>
								</AppSidebarGroupLabel>
								<AppCollapsiblePanel>
									<AppSidebarGroupContent>
										<AppSidebarMenu>
											{writings.map((w) => (
												<AppSidebarMenuItem key={w.id}>
													<AppSidebarMenuButton
														asChild
														className="h-9 px-3"
														isActive={location.pathname === `/content/${w.id}`}
													>
														<Link to={`/content/${w.id}`}>
															<span className="flex-1 truncate">
																{w.title || t('sidebar.untitledWriting')}
															</span>
														</Link>
													</AppSidebarMenuButton>
												</AppSidebarMenuItem>
											))}
										</AppSidebarMenu>
									</AppSidebarGroupContent>
								</AppCollapsiblePanel>
							</AppSidebarGroup>
						</AppCollapsible>

						<AppSidebarSeparator className="my-1" />

						{/* Resources */}
						<AppSidebarGroup className="py-0">
							<AppSidebarGroupContent>
								<AppSidebarMenu>
									<AppSidebarMenuItem>
										<AppSidebarMenuButton
											asChild
											className="h-9 px-3"
											isActive={location.pathname === '/resources'}
										>
											<Link to="/resources">
												<Library className="h-3.5 w-3.5 shrink-0" />
												<span className="flex-1 truncate">{t('appLayout.resources')}</span>
											</Link>
										</AppSidebarMenuButton>
									</AppSidebarMenuItem>
								</AppSidebarMenu>
							</AppSidebarGroupContent>
						</AppSidebarGroup>

						<AppSidebarSeparator className="my-1" />

						{/* Debug + Agents */}
						<AppSidebarGroup className="py-0">
							<AppSidebarGroupContent>
								<AppSidebarMenu>
									<AppSidebarMenuItem>
										<AppSidebarMenuButton
											asChild
											className="h-9 px-3"
											isActive={location.pathname === '/debug'}
										>
											<Link to="/debug">
												<Bug className="h-3.5 w-3.5 shrink-0" />
												<span className="flex-1 truncate">{t('appLayout.debug')}</span>
											</Link>
										</AppSidebarMenuButton>
									</AppSidebarMenuItem>
								</AppSidebarMenu>
							</AppSidebarGroupContent>
						</AppSidebarGroup>
					</AppSidebarContent>

					{/* Footer — Settings link */}
					<Link
						to="/settings"
						className={cn(
							'flex items-center gap-2 border-t px-4 py-3 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
							location.pathname.startsWith('/settings') &&
								'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
						)}
					>
						<Settings className="h-3.5 w-3.5 shrink-0" />
						<span className="truncate">{t('menu.settings')}</span>
					</Link>
				</AppSidebar>

				<AppSidebarInset className="flex flex-col flex-1 min-h-0 min-w-0">
					<main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">{children}</main>
				</AppSidebarInset>
			</div>
		</>
	);
}

// ---------------------------------------------------------------------------
// AppLayout
// ---------------------------------------------------------------------------

export function AppLayout({ children }: AppLayoutProps) {
	useLanguage();

	return (
		<div className="flex flex-col h-screen min-w-[800px] overflow-x-hidden">
			<AppSidebarProvider className="flex-col flex-1 min-h-0">
				<AppLayoutInner>{children}</AppLayoutInner>
			</AppSidebarProvider>
		</div>
	);
}
