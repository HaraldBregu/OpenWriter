import React, { useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorkspaceListener } from '../../../hooks/use-workspace-listener';
import { useWorkspaceValidation } from '../../../hooks/use-workspace-validation';
import { useCreateWriting } from '../../../hooks/use-create-writing';
import { useAppDispatch, useAppSelector } from '../../../store';
import { selectProjectName, selectWorkspaceName } from '../../../store/workspace/selectors';
import { loadCurrentWorkspace, loadProjectName } from '../../../store/workspace/actions';
import { selectAllDocuments } from '../../../store/documents/selectors';
import { documentAdded } from '../../../store/documents/actions';
import {
	RESOURCE_SECTION_ORDER,
	RESOURCE_SECTIONS,
} from '../../../pages/resources/shared/resource-sections';
import { AppTitleBar } from './AppTitleBar';
import {
	AppCollapsible,
	AppCollapsibleTrigger,
	AppCollapsiblePanel,
	AppPopover,
	AppPopoverContent,
	AppPopoverTrigger,
	AppSidebarContainer,
	AppSidebarLayout,
	AppSidebarInsetLayout,
	AppSidebarContent,
	AppSidebarFooter,
	AppSidebarGroup,
	AppSidebarGroupContent,
	AppSidebarGroupLabel,
	AppSidebarMenu,
	AppSidebarMenuButton,
	AppSidebarMenuItem,
	AppSidebarProvider,
	AppSidebarHeader,
	AppIconOpenWriter,
	useSidebar,
} from './app';
import {
	Settings,
	ChevronRight,
	ChevronsUpDown,
	Database,
	Search,
	ListTodo,
	Globe,
	CircleHelp,
	CircleArrowUp,
	Download,
	Gift,
	Info,
	LogOut,
	Plus,
	ScrollText,
	Sun,
	Monitor,
	Moon,
} from 'lucide-react';
import { useAppActions, useCurrentUser, useThemeMode } from '../contexts';
import type { ThemeMode } from '../contexts';
import { cn } from '../lib/utils';

interface AppLayoutProps {
	readonly children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// AppLayoutInner — rendered inside AppSidebarProvider so it can call useSidebar
// ---------------------------------------------------------------------------

function AppLayoutInner({ children }: AppLayoutProps) {
	const { t } = useTranslation();
	const { toggleSidebar, open } = useSidebar();
	const location = useLocation();
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const handleNavigateBack = useCallback(() => navigate(-1), [navigate]);
	const handleNavigateForward = useCallback(() => navigate(1), [navigate]);
	const workspaceNameFromPath = useAppSelector(selectWorkspaceName);
	const projectName = useAppSelector(selectProjectName);
	const currentUser = useCurrentUser();
	const themeMode = useThemeMode();
	const { setTheme } = useAppActions();

	// Listen for workspace changes from main process and update Redux
	useWorkspaceListener();

	// Monitor workspace folder for external deletion and redirect to Welcome
	useWorkspaceValidation();

	// Load current workspace and project name on mount
	useEffect(() => {
		dispatch(loadCurrentWorkspace()).then(() => {
			dispatch(loadProjectName());
		});
	}, [dispatch]);

	// -------------------------------------------------------------------------
	// Documents list — sourced from Redux (loaded/watched at app startup)
	// -------------------------------------------------------------------------
	const documents = [...useAppSelector(selectAllDocuments)].sort(
		(a, b) => b.createdAt - a.createdAt
	);

	// -------------------------------------------------------------------------
	// New document handler — optimistic Redux update
	// -------------------------------------------------------------------------
	const handleDocumentCreated = useCallback(
		(result: { id: string }) => {
			dispatch(
				documentAdded({
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
		onCreated: handleDocumentCreated,
	});

	const displayWorkspaceName = projectName || workspaceNameFromPath || 'OpenWriter';
	const sidebarSubtitle =
		displayWorkspaceName === 'OpenWriter'
			? t('appLayout.workspaceLabel', 'Workspace')
			: displayWorkspaceName;
	const isLandingPage = location.pathname === '/';
	const footerUserName = currentUser?.name?.trim() || 'User';
	const footerUserEmail = currentUser?.email?.trim() || 'user@example.com';
	const footerUserInitial = footerUserName.charAt(0).toUpperCase();
	const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
		{
			value: 'light',
			label: t('settings.theme.light', 'Light'),
			icon: Sun,
		},
		{
			value: 'system',
			label: t('settings.theme.system', 'System'),
			icon: Monitor,
		},
		{
			value: 'dark',
			label: t('settings.theme.dark', 'Dark'),
			icon: Moon,
		},
	];

	return (
		<>
			<AppTitleBar
				title={displayWorkspaceName}
				onToggleSidebar={toggleSidebar}
				onNavigateBack={isLandingPage ? undefined : handleNavigateBack}
				onNavigateForward={isLandingPage ? undefined : handleNavigateForward}
			/>

			<AppSidebarContainer>
				<AppSidebarLayout>
					{/* Header */}
					<AppSidebarHeader>
						<AppSidebarMenu>
							<AppSidebarMenuItem>
								<AppSidebarMenuButton
									onClick={() => navigate('/home')}
									className={
										open
											? 'h-auto min-h-12 px-3 py-2.5'
											: 'mx-auto flex h-8 w-8 items-center justify-center p-0'
									}
								>
									{open ? (
										<AppIconOpenWriter className="h-7 w-7 shrink-0 text-sidebar-foreground" />
									) : (
										<AppIconOpenWriter className="h-5 w-5 text-sidebar-foreground" />
									)}
									{open && (
										<div className="grid min-w-0 flex-1 text-left leading-tight">
											<span className="truncate text-[0.95rem] font-medium tracking-tight text-sidebar-foreground">
												OpenWriter
											</span>
											<span className="truncate text-xs text-sidebar-foreground/60">
												{sidebarSubtitle}
											</span>
										</div>
									)}
								</AppSidebarMenuButton>
							</AppSidebarMenuItem>
						</AppSidebarMenu>
					</AppSidebarHeader>

					{/* Nav */}
					<AppSidebarContent className="gap-4 py-2">
						{/* New Writing + Quick Actions */}
						<AppSidebarGroup className="py-0">
							<AppSidebarGroupContent>
								<AppSidebarMenu>
									<AppSidebarMenuItem>
										<AppSidebarMenuButton
											className="group/btn h-9 px-3"
											onClick={createWriting}
											disabled={creatingWriting}
										>
											<Plus className="h-4 w-4 shrink-0" />
											<span className="flex-1 truncate">{t('sidebar.newWriting')}</span>
											<span className="text-sm text-muted-foreground/60 opacity-0 group-hover/btn:opacity-100 transition-opacity">
												Ctrl+Alt+N
											</span>
										</AppSidebarMenuButton>
									</AppSidebarMenuItem>
									<AppSidebarMenuItem>
										<AppSidebarMenuButton
											asChild
											className="group/btn h-9 px-3"
											isActive={location.pathname === '/search'}
										>
											<Link to="/search">
												<Search className="h-4 w-4 shrink-0" />
												<span className="flex-1 truncate">{t('menu.search', 'Search')}</span>
												<span className="text-sm text-muted-foreground/60 opacity-0 group-hover/btn:opacity-100 transition-opacity">
													Ctrl+K
												</span>
											</Link>
										</AppSidebarMenuButton>
									</AppSidebarMenuItem>
								</AppSidebarMenu>
							</AppSidebarGroupContent>
						</AppSidebarGroup>

						{/* Writings collapsible group — hidden when sidebar is collapsed */}
						{open && (
							<AppCollapsible defaultOpen className="py-0">
								<AppSidebarGroup className="py-0">
									<AppSidebarGroupLabel asChild>
										<AppCollapsibleTrigger className="group cursor-pointer select-none hover:text-sidebar-foreground transition-colors">
											{t('sidebar.writings')}
											<ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 ml-auto mr-1 group-data-[panel-open]:rotate-90" />
										</AppCollapsibleTrigger>
									</AppSidebarGroupLabel>
									<AppCollapsiblePanel>
										<AppSidebarGroupContent>
											<AppSidebarMenu>
												{documents.map((w) => (
													<AppSidebarMenuItem key={w.id}>
														<AppSidebarMenuButton
															asChild
															className="h-9 px-3"
															isActive={location.pathname === `/content/${w.id}`}
														>
															<Link to={`/content/${w.id}`}>
																{w.emoji && (
																	<span
																		aria-hidden="true"
																		className="shrink-0 text-base leading-none"
																	>
																		{w.emoji}
																	</span>
																)}
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
						)}

						{/* Resources */}
						<AppCollapsible defaultOpen className="py-0">
							<AppSidebarGroup className="py-0">
								<AppSidebarGroupLabel asChild>
									<AppCollapsibleTrigger className="group cursor-pointer select-none hover:text-sidebar-foreground transition-colors">
										{t('appLayout.resources', 'Resources')}
										<ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 ml-auto mr-1 group-data-[panel-open]:rotate-90" />
									</AppCollapsibleTrigger>
								</AppSidebarGroupLabel>
								<AppCollapsiblePanel>
									<AppSidebarGroupContent>
										<AppSidebarMenu>
											{RESOURCE_SECTION_ORDER.map((sectionId) => {
												const section = RESOURCE_SECTIONS[sectionId];
												const Icon = section.icon;

												return (
													<AppSidebarMenuItem key={section.id}>
														<AppSidebarMenuButton
															asChild
															className="h-9 px-3"
															isActive={location.pathname === section.route}
														>
															<Link to={section.route}>
																<Icon className="h-4 w-4 shrink-0" />
																<span className="flex-1 truncate">{t(section.titleKey)}</span>
															</Link>
														</AppSidebarMenuButton>
													</AppSidebarMenuItem>
												);
											})}
										</AppSidebarMenu>
									</AppSidebarGroupContent>
								</AppCollapsiblePanel>
							</AppSidebarGroup>
						</AppCollapsible>

						{/* Debug */}
						<AppCollapsible defaultOpen className="py-0">
							<AppSidebarGroup className="py-0">
								<AppSidebarGroupLabel asChild>
									<AppCollapsibleTrigger className="group cursor-pointer select-none hover:text-sidebar-foreground transition-colors">
										{t('appLayout.debug')}
										<ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 ml-auto mr-1 group-data-[panel-open]:rotate-90" />
									</AppCollapsibleTrigger>
								</AppSidebarGroupLabel>
								<AppCollapsiblePanel>
									<AppSidebarGroupContent>
										<AppSidebarMenu>
											<AppSidebarMenuItem>
												<AppSidebarMenuButton
													asChild
													className="h-9 px-3"
													isActive={location.pathname === '/debug/tasks'}
												>
													<Link to="/debug/tasks">
														<ListTodo className="h-4 w-4 shrink-0" />
														<span className="flex-1 truncate">{t('debug.tasks')}</span>
													</Link>
												</AppSidebarMenuButton>
											</AppSidebarMenuItem>
											<AppSidebarMenuItem>
												<AppSidebarMenuButton
													asChild
													className="h-9 px-3"
													isActive={location.pathname === '/debug/redux'}
												>
													<Link to="/debug/redux">
														<Database className="h-4 w-4 shrink-0" />
														<span className="flex-1 truncate">{t('appLayout.redux', 'Redux')}</span>
													</Link>
												</AppSidebarMenuButton>
											</AppSidebarMenuItem>
											<AppSidebarMenuItem>
												<AppSidebarMenuButton
													asChild
													className="h-9 px-3"
													isActive={location.pathname === '/debug/logs'}
												>
													<Link to="/debug/logs">
														<ScrollText className="h-4 w-4 shrink-0" />
														<span className="flex-1 truncate">{t('debug.logs', 'Logs')}</span>
													</Link>
												</AppSidebarMenuButton>
											</AppSidebarMenuItem>
										</AppSidebarMenu>
									</AppSidebarGroupContent>
								</AppCollapsiblePanel>
							</AppSidebarGroup>
						</AppCollapsible>
					</AppSidebarContent>

					<AppSidebarFooter className="border-t p-2">
						<AppPopover>
							<AppPopoverTrigger asChild>
								<button
									type="button"
									className={
										open
											? 'flex w-full items-center gap-2 rounded-xl border border-transparent bg-sidebar px-2 py-2 text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
											: 'flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-sidebar p-0 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
									}
									aria-label={t('appLayout.accountMenu', 'Open account menu')}
								>
									<div
										className={
											open
												? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground'
												: 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent/70 text-xs font-semibold text-sidebar-foreground ring-1 ring-sidebar-border/70'
										}
									>
										{footerUserInitial}
									</div>
									{open && (
										<>
											<div className="min-w-0 flex-1">
												<p className="truncate text-[0.95rem] font-medium text-sidebar-foreground">
													{footerUserName}
												</p>
												<p className="truncate text-[0.85rem] text-muted-foreground">
													{t('appLayout.plan', 'Pro plan')}
												</p>
											</div>
											<div className="flex items-center gap-1">
												<div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground">
													<Download className="h-4 w-4" />
												</div>
												<ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
											</div>
										</>
									)}
								</button>
							</AppPopoverTrigger>
							<AppPopoverContent
								align="start"
								side="top"
								sideOffset={8}
								className={
									open
										? 'w-[var(--radix-popover-trigger-width)] rounded-2xl p-2'
										: 'w-64 rounded-2xl p-2'
								}
							>
								<div className="mb-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">
									{footerUserEmail}
								</div>
								<button
									type="button"
									onClick={() => navigate('/settings')}
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
								>
									<Settings className="h-4 w-4 text-muted-foreground" />
									<span className="flex-1 text-left">{t('menu.settings')}</span>
									<span className="text-xs text-muted-foreground">⇧⌘,</span>
								</button>
								<button
									type="button"
									onClick={() => navigate('/settings/general')}
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
								>
									<Globe className="h-4 w-4 text-muted-foreground" />
									<span className="flex-1 text-left">{t('menu.language', 'Language')}</span>
									<ChevronRight className="h-4 w-4 text-muted-foreground" />
								</button>
								<button
									type="button"
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
								>
									<CircleHelp className="h-4 w-4 text-muted-foreground" />
									<span className="flex-1 text-left">{t('menu.getHelp', 'Get help')}</span>
								</button>

								<div className="my-2 h-px bg-border" />

								<button
									type="button"
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
								>
									<CircleArrowUp className="h-4 w-4 text-muted-foreground" />
									<span className="flex-1 text-left">{t('menu.upgradePlan', 'Upgrade plan')}</span>
								</button>
								<button
									type="button"
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
								>
									<Download className="h-4 w-4 text-muted-foreground" />
									<span className="flex-1 text-left">
										{t('menu.appsAndExtensions', 'Get apps and extensions')}
									</span>
								</button>
								<button
									type="button"
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
								>
									<Gift className="h-4 w-4 text-muted-foreground" />
									<span className="flex-1 text-left">{t('menu.giftClaude', 'Gift Claude')}</span>
								</button>
								<button
									type="button"
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
								>
									<Info className="h-4 w-4 text-muted-foreground" />
									<span className="flex-1 text-left">{t('menu.learnMore', 'Learn more')}</span>
									<ChevronRight className="h-4 w-4 text-muted-foreground" />
								</button>

								<div className="my-2 h-px bg-border" />

								<div className="flex items-center justify-between px-3 py-2">
									<span className="text-sm">{t('settings.theme.title')}</span>
									<div
										role="group"
										aria-label={t('settings.theme.title')}
										className="inline-flex rounded-full border border-border bg-muted p-0.5"
									>
										{themeOptions.map(({ value, label, icon: Icon }) => (
											<button
												key={value}
												type="button"
												onClick={() => setTheme(value)}
												className={cn(
													'relative rounded-full p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
													themeMode === value
														? 'bg-background text-foreground shadow-sm'
														: 'bg-transparent text-muted-foreground hover:text-foreground'
												)}
												aria-label={label}
												aria-pressed={themeMode === value}
											>
												<Icon size={16} />
											</button>
										))}
									</div>
								</div>

								<div className="my-2 h-px bg-border" />

								<button
									type="button"
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
								>
									<LogOut className="h-4 w-4 text-muted-foreground" />
									<span className="flex-1 text-left">{t('menu.logOut', 'Log out')}</span>
								</button>
							</AppPopoverContent>
						</AppPopover>
					</AppSidebarFooter>
				</AppSidebarLayout>

				<AppSidebarInsetLayout>{children}</AppSidebarInsetLayout>
			</AppSidebarContainer>
		</>
	);
}

// ---------------------------------------------------------------------------
// AppLayout
// ---------------------------------------------------------------------------

export function AppLayout({ children }: AppLayoutProps) {
	return (
		<div className="flex flex-col h-screen min-w-[800px] overflow-x-hidden">
			<AppSidebarProvider
				className="flex-col flex-1 min-h-0"
				style={{ '--sidebar-width': '20rem' } as React.CSSProperties}
			>
				<AppLayoutInner>{children}</AppLayoutInner>
			</AppSidebarProvider>
		</div>
	);
}
