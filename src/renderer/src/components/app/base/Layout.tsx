import React, { useCallback, useEffect, useState } from 'react';
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
import { TitleBar } from '../titlebar/TitleBar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Button } from '@/components/ui/Button';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import {
	Combobox,
	ComboboxContent,
	ComboboxItem,
	ComboboxList,
	ComboboxSeparator,
	ComboboxTrigger,
} from '@/components/ui/Combobox';
import {
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarHeader,
	useSidebar,
	Sidebar,
} from '@/components/ui/Sidebar';
import { AppIconOpenWriter } from '..';
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
import { useAppActions, useCurrentUser, useThemeMode } from '../../../contexts';
import { SidebarPageContainer, SidebarPageInset } from '../sidebar/Sidebar';

interface LayoutProps {
	readonly children: React.ReactNode;
}

function Container({ children }: LayoutProps) {
	const { t } = useTranslation();
	const { toggleSidebar, open } = useSidebar();
	const location = useLocation();
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const [accountMenuOpen, setAccountMenuOpen] = useState(false);
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

	const accountMenuItems = [
		{
			value: 'settings',
			label: t('menu.settings'),
			icon: Settings,
		},
		{
			value: 'language',
			label: t('menu.language', 'Language'),
			icon: Globe,
		},
		{
			value: 'help',
			label: t('menu.getHelp', 'Get help'),
			icon: CircleHelp,
		},
		{
			value: 'upgrade',
			label: t('menu.upgradePlan', 'Upgrade plan'),
			icon: CircleArrowUp,
		},
		{
			value: 'extensions',
			label: t('menu.appsAndExtensions', 'Get apps and extensions'),
			icon: Download,
		},
		{
			value: 'gift',
			label: t('menu.giftClaude', 'Gift Claude'),
			icon: Gift,
		},
		{
			value: 'learnMore',
			label: t('menu.learnMore', 'Learn more'),
			icon: Info,
		},
		{
			value: 'logOut',
			label: t('menu.logOut', 'Log out'),
			icon: LogOut,
		},
	] as const;

	const handleAccountMenuValueChange = useCallback(
		(value: string | null) => {
			if (!value) return;

			setAccountMenuOpen(false);

			switch (value) {
				case 'settings':
					navigate('/settings');
					break;
				case 'language':
					navigate('/settings/general');
					break;
				case 'upgrade':
				case 'extensions':
				case 'gift':
				case 'learnMore':
				case 'help':
				case 'logOut':
					break;
				default:
					break;
			}
		},
		[navigate]
	);

	return (
		<>
			<TitleBar
				title={displayWorkspaceName}
				onToggleSidebar={toggleSidebar}
				onNavigateBack={isLandingPage ? undefined : handleNavigateBack}
				onNavigateForward={isLandingPage ? undefined : handleNavigateForward}
			/>

			<SidebarPageContainer>
				<Sidebar collapsible="icon" className="top-12 h-[calc(100svh-3rem)]">
					{/* Header */}
					<SidebarHeader className="bg-transparent border-b">
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									onClick={() => navigate('/home')}
									className={
										open
											? 'h-auto min-h-12 px-3 py-2.5'
											: 'mx-auto flex h-8 w-8 items-center justify-center p-0'
									}
								>
									{open ? (
										<AppIconOpenWriter className="h-8 w-8 shrink-0 text-sidebar-foreground" />
									) : (
										<AppIconOpenWriter className="h-6 w-6 text-sidebar-foreground" />
									)}
									{open && (
										<div className="grid min-w-0 flex-1 text-left leading-tight">
											<span className="truncate text-base font-medium tracking-tight text-sidebar-foreground">
												OpenWriter
											</span>
											<span className="truncate text-sm text-sidebar-foreground/60">
												{sidebarSubtitle}
											</span>
										</div>
									)}
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarHeader>

					{/* Nav */}
					<SidebarContent className="gap-4 py-2">
						{/* New Writing + Quick Actions */}
						<SidebarGroup className="py-0">
							<SidebarGroupContent>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton
											className="group/btn h-9 px-3"
											onClick={createWriting}
											disabled={creatingWriting}
										>
											<Plus className="h-5 w-5 shrink-0" />
											<span className="flex-1 truncate">{t('sidebar.newWriting')}</span>
											<span className="text-sm text-muted-foreground/60 opacity-0 group-hover/btn:opacity-100 transition-opacity">
												Ctrl+Alt+N
											</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={<Link to="/search" />}
											className="group/btn h-9 px-3"
											isActive={location.pathname === '/search'}
										>
											<Search className="h-5 w-5 shrink-0" />
											<span className="flex-1 truncate">{t('menu.search', 'Search')}</span>
											<span className="text-sm text-muted-foreground/60 opacity-0 group-hover/btn:opacity-100 transition-opacity">
												Ctrl+K
											</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>

						{/* Writings collapsible group — hidden when sidebar is collapsed */}
						{open && (
							<Collapsible defaultOpen className="py-0">
								<SidebarGroup className="py-0">
									<SidebarGroupLabel
										render={
											<CollapsibleTrigger className="group cursor-pointer select-none hover:text-sidebar-foreground transition-colors" />
										}
									>
										{t('sidebar.writings')}
										<ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 ml-auto mr-1 group-data-[panel-open]:rotate-90" />
									</SidebarGroupLabel>
									<CollapsibleContent>
										<SidebarGroupContent>
											<SidebarMenu>
												{documents.map((w) => (
													<SidebarMenuItem key={w.id}>
														<SidebarMenuButton
															render={<Link to={`/content/${w.id}`} />}
															className="h-9 px-3"
															isActive={location.pathname === `/content/${w.id}`}
														>
															<span className="flex-1 truncate">
																{w.title || t('sidebar.untitledWriting')}
															</span>
														</SidebarMenuButton>
													</SidebarMenuItem>
												))}
											</SidebarMenu>
										</SidebarGroupContent>
									</CollapsibleContent>
								</SidebarGroup>
							</Collapsible>
						)}

						{/* Resources */}
						<Collapsible defaultOpen className="py-0">
							<SidebarGroup className="py-0">
								<SidebarGroupLabel
									render={
										<CollapsibleTrigger className="group cursor-pointer select-none hover:text-sidebar-foreground transition-colors" />
									}
								>
									{t('appLayout.resources', 'Resources')}
									<ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 ml-auto mr-1 group-data-[panel-open]:rotate-90" />
								</SidebarGroupLabel>
								<CollapsibleContent>
									<SidebarGroupContent>
										<SidebarMenu>
											{RESOURCE_SECTION_ORDER.map((sectionId) => {
												const section = RESOURCE_SECTIONS[sectionId];
												const Icon = section.icon;

												return (
													<SidebarMenuItem key={section.id}>
														<SidebarMenuButton
															render={<Link to={section.route} />}
															className="h-9 px-3"
															isActive={location.pathname === section.route}
														>
															<Icon className="h-5 w-5 shrink-0" />
															<span className="flex-1 truncate">{t(section.titleKey)}</span>
														</SidebarMenuButton>
													</SidebarMenuItem>
												);
											})}
										</SidebarMenu>
									</SidebarGroupContent>
								</CollapsibleContent>
							</SidebarGroup>
						</Collapsible>

						{/* Debug */}
						<Collapsible defaultOpen className="py-0">
							<SidebarGroup className="py-0">
								<SidebarGroupLabel
									render={
										<CollapsibleTrigger className="group cursor-pointer select-none hover:text-sidebar-foreground transition-colors" />
									}
								>
									{t('appLayout.debug')}
									<ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 ml-auto mr-1 group-data-[panel-open]:rotate-90" />
								</SidebarGroupLabel>
								<CollapsibleContent>
									<SidebarGroupContent>
										<SidebarMenu>
											<SidebarMenuItem>
												<SidebarMenuButton
													render={<Link to="/debug/tasks" />}
													className="h-9 px-3"
													isActive={location.pathname === '/debug/tasks'}
												>
													<ListTodo className="h-5 w-5 shrink-0" />
													<span className="flex-1 truncate">{t('debug.tasks')}</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
											<SidebarMenuItem>
												<SidebarMenuButton
													render={<Link to="/debug/redux" />}
													className="h-9 px-3"
													isActive={location.pathname === '/debug/redux'}
												>
													<Database className="h-5 w-5 shrink-0" />
													<span className="flex-1 truncate">{t('appLayout.redux', 'Redux')}</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
											<SidebarMenuItem>
												<SidebarMenuButton
													render={<Link to="/debug/logs" />}
													className="h-9 px-3"
													isActive={location.pathname === '/debug/logs'}
												>
													<ScrollText className="h-5 w-5 shrink-0" />
													<span className="flex-1 truncate">{t('debug.logs', 'Logs')}</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
										</SidebarMenu>
									</SidebarGroupContent>
								</CollapsibleContent>
							</SidebarGroup>
						</Collapsible>
					</SidebarContent>

					<SidebarFooter className="border-t p-2">
						<Combobox<string>
							open={accountMenuOpen}
							onOpenChange={setAccountMenuOpen}
							onValueChange={handleAccountMenuValueChange}
							defaultValue={null}
						>
							<ComboboxTrigger
								render={
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
													? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground'
													: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent/70 text-xs font-semibold text-sidebar-foreground ring-1 ring-sidebar-border/70'
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
								}
								className="[&>svg:last-child]:hidden"
							/>
							<ComboboxContent
								side="top"
								align="start"
								sideOffset={8}
								className="min-w-64 rounded-2xl p-2"
							>
								<div className="mb-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">
									{footerUserEmail}
								</div>
								<ComboboxList className="p-0">
									{accountMenuItems.map(({ value, label, icon: Icon }, index) => (
										<React.Fragment key={value}>
											<ComboboxItem
												value={value}
												className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground"
											>
												<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
												<span className="flex-1 text-left">{label}</span>
												{value === 'settings' && (
													<span className="text-xs text-muted-foreground">⇧⌘,</span>
												)}
												{value === 'language' && (
													<ChevronRight className="h-4 w-4 text-muted-foreground" />
												)}
											</ComboboxItem>
											{index === 2 && <ComboboxSeparator className="my-2" />}
											{index === 6 && <ComboboxSeparator className="my-2" />}
										</React.Fragment>
									))}
								</ComboboxList>

								<div className="my-2 h-px bg-border" />

								<div className="flex items-center justify-between px-3 py-2">
									<span className="text-sm">{t('settings.theme.title')}</span>
									<ButtonGroup>
										<Button
											variant={themeMode === 'light' ? 'outline-selected' : 'outline'}
											size="icon-sm"
											onClick={() => setTheme('light')}
											aria-label={t('settings.theme.light', 'Light')}
											aria-pressed={themeMode === 'light'}
										>
											<Sun className="size-3.5" />
										</Button>
										<Button
											variant={themeMode === 'system' ? 'outline-selected' : 'outline'}
											size="icon-sm"
											onClick={() => setTheme('system')}
											aria-label={t('settings.theme.system', 'System')}
											aria-pressed={themeMode === 'system'}
										>
											<Monitor className="size-3.5" />
										</Button>
										<Button
											variant={themeMode === 'dark' ? 'outline-selected' : 'outline'}
											size="icon-sm"
											onClick={() => setTheme('dark')}
											aria-label={t('settings.theme.dark', 'Dark')}
											aria-pressed={themeMode === 'dark'}
										>
											<Moon className="size-3.5" />
										</Button>
									</ButtonGroup>
								</div>
							</ComboboxContent>
						</Combobox>
					</SidebarFooter>
				</Sidebar>

				<SidebarPageInset>{children}</SidebarPageInset>
			</SidebarPageContainer>
		</>
	);
}

export function Layout({ children }: LayoutProps) {
	return (
		<SidebarProvider
			className="flex-col flex-1 min-h-0 flex h-screen min-w-200 overflow-x-hidden"
			style={{ '--sidebar-width': '18rem' } as React.CSSProperties}
		>
			<Container>{children}</Container>
		</SidebarProvider>
	);
}
