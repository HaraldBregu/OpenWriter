import React, { useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorkspaceListener } from '../../../hooks/use-workspace-listener';
import { useWorkspaceValidation } from '../../../hooks/use-workspace-validation';
import { useCreateWriting } from '../../../hooks/use-create-writing';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
	selectCurrentWorkspacePath,
	selectProjectDescription,
	selectProjectName,
	selectRecentWorkspaces,
	selectWorkspaceName,
} from '../../../store/workspace/selectors';
import {
	loadCurrentWorkspace,
	loadProjectName,
	loadRecentWorkspaces,
	openWorkspacePicker,
	selectWorkspace,
} from '../../../store/workspace/actions';
import { selectAllDocuments, documentAdded } from '../../../store/workspace';
import { TitleBar } from '../titlebar/TitleBar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Button } from '@/components/ui/Button';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/Item';
import {
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
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
	Globe,
	CircleHelp,
	CircleArrowUp,
	Download,
	Info,
	LogOut,
	Home,
	Plus,
	Sparkles,
	Sun,
	Monitor,
	Moon,
	MoreHorizontal,
	Pencil,
	Trash2,
	FileAudio,
	FileImage,
	FileText,
	Video,
} from 'lucide-react';
import { SidebarPageContainer, SidebarPageInset } from '../sidebar/Sidebar';
import { CommandModalProvider, useCommandModal } from '../command-modals';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { useAppActions } from '@/hooks/use-app-actions';
import { getShortcutLabel, ShortcutId, type Platform } from '../../../../../shared/shortcuts';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuItem,
	DropdownMenuGroup,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuShortcut,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from '@/components/ui/DropdownMenu';
import { useLanguageMode } from '@/hooks/use-language-mode';
import type { AppLanguage } from '@/contexts/AppContext';

interface LayoutProps {
	readonly children: React.ReactNode;
}

const ACCOUNT_MENU_ITEM_CLASS = 'gap-3 px-2 py-2';

const LANGUAGE_OPTIONS: readonly { value: AppLanguage; labelKey: string }[] = [
	{ value: 'en', labelKey: 'settings.language.en' },
	{ value: 'it', labelKey: 'settings.language.it' },
] as const;

function Container({ children }: LayoutProps) {
	const { t } = useTranslation();
	const { toggleSidebar, open } = useSidebar();
	const { activeModal, open: openCommandModal } = useCommandModal();
	const location = useLocation();
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const handleNavigateBack = useCallback(() => navigate(-1), [navigate]);
	const handleNavigateForward = useCallback(() => navigate(1), [navigate]);
	const workspaceNameFromPath = useAppSelector(selectWorkspaceName);
	const projectName = useAppSelector(selectProjectName);
	const projectDescription = useAppSelector(selectProjectDescription);
	const currentWorkspacePath = useAppSelector(selectCurrentWorkspacePath);
	const recentWorkspaces = useAppSelector(selectRecentWorkspaces);
	const themeMode = useThemeMode();
	const language = useLanguageMode();
	const { setTheme, setLanguage } = useAppActions();
	const shortcutPlatform: Platform =
		typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')
			? 'mac'
			: typeof navigator !== 'undefined' && navigator.userAgent.includes('Win')
				? 'win'
				: 'linux';
	const searchShortcutLabel = getShortcutLabel(ShortcutId.openAppSearch, shortcutPlatform);
	const newDocumentShortcutLabel = getShortcutLabel(ShortcutId.newDocument, shortcutPlatform);

	// Listen for workspace changes from main process and update Redux
	useWorkspaceListener();

	// Monitor workspace folder for external deletion and redirect to Welcome
	useWorkspaceValidation();

	// Load current workspace, project name, and recent workspaces on mount
	useEffect(() => {
		dispatch(loadCurrentWorkspace()).then(() => {
			dispatch(loadProjectName());
		});
		dispatch(loadRecentWorkspaces());
	}, [dispatch]);

	const workspaceNameFromPathString = (path: string) => {
		const parts = path.split(/[/\\]/);
		return parts[parts.length - 1] || path;
	};

	const handleSelectWorkspace = useCallback(
		(path: string) => {
			if (path !== currentWorkspacePath) {
				dispatch(selectWorkspace(path));
			}
		},
		[dispatch, currentWorkspacePath]
	);

	const handleAddWorkspace = useCallback(() => {
		dispatch(openWorkspacePicker()).then(() => {
			dispatch(loadRecentWorkspaces());
		});
	}, [dispatch]);

	const handleOpenSearch = useCallback(() => {
		openCommandModal('search');
	}, [openCommandModal]);

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

	useEffect(() => {
		if (typeof window.app?.onShortcut !== 'function') return;
		return window.app.onShortcut((id) => {
			if (id === ShortcutId.newDocument) {
				createWriting();
			}
		});
	}, [createWriting]);

	const displayWorkspaceName = projectName || workspaceNameFromPath || 'OpenWriter';
	const sidebarTitle = projectName || workspaceNameFromPath || 'OpenWriter';
	const sidebarSubtitle = projectDescription?.trim() || t('appLayout.workspaceLabel', 'Workspace');
	const isLandingPage = location.pathname === '/';
	const footerUserName = 'User';
	const footerUserEmail = 'user@example.com';
	const footerUserInitial = footerUserName.charAt(0).toUpperCase();

	const accountMenuItems = [
		{
			value: 'settings',
			label: t('menu.settings'),
			icon: Settings,
		},
		{
			value: 'agents',
			label: t('settings.tabs.agents', 'Agents'),
			icon: Sparkles,
		},
		{
			value: 'system',
			label: t('settings.tabs.system', 'System'),
			icon: Monitor,
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
			value: 'learnMore',
			label: t('menu.learnMore', 'Learn more'),
			icon: Info,
		},
	] as const;

	const handleAccountMenuValueChange = useCallback(
		(value: string) => {
			switch (value) {
				case 'settings':
					navigate('/settings');
					break;
				case 'agents':
					navigate('/settings/agents');
					break;
				case 'system':
					navigate('/settings/system');
					break;
				default:
					break;
			}
		},
		[navigate]
	);

	const handleLanguageChange = useCallback(
		(value: string) => {
			if (value === 'en' || value === 'it') {
				setLanguage(value);
			}
		},
		[setLanguage]
	);

	return (
		<>
			<TitleBar
				title={displayWorkspaceName}
				onToggleSidebar={toggleSidebar}
				onNavigateBack={isLandingPage ? undefined : handleNavigateBack}
				onNavigateForward={isLandingPage ? undefined : handleNavigateForward}
				showSidebarToggles={location.pathname.startsWith('/content/')}
			/>

			<SidebarPageContainer>
				<Sidebar collapsible="icon" className="top-12 h-[calc(100svh-3rem)]">
					<SidebarHeader>
						<SidebarMenu>
							<SidebarMenuItem>
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<SidebarMenuButton
												size="lg"
												className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
											>
												<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
													<AppIconOpenWriter className="h-6 w-6" />
												</div>
												<div className="grid flex-1 text-left text-sm leading-tight">
													<span className="truncate font-medium">{sidebarTitle}</span>
													<span
														className="truncate text-xs text-muted-foreground"
														title={sidebarSubtitle}
													>
														{sidebarSubtitle}
													</span>
												</div>
												<ChevronsUpDown className="ml-auto" />
											</SidebarMenuButton>
										}
									/>
									<DropdownMenuContent
										className="w-(--radix-dropdown-menu-trigger-width) min-w-72"
										side="top"
										align="end"
										sideOffset={4}
									>
										<DropdownMenuGroup>
											<DropdownMenuLabel className="text-xs text-muted-foreground">
												{t('appLayout.workspaces', 'Workspaces')}
											</DropdownMenuLabel>
											{recentWorkspaces.map((workspace, index) => {
												const name = workspace.name || workspaceNameFromPathString(workspace.path);
												const isActive = workspace.path === currentWorkspacePath;
												return (
													<DropdownMenuItem
														key={workspace.path}
														onClick={() => handleSelectWorkspace(workspace.path)}
														className="gap-2 p-2"
													>
														<div className="flex size-6 items-center justify-center rounded-md border">
															<AppIconOpenWriter className="size-3.5 shrink-0" />
														</div>
														<span className={isActive ? 'font-medium' : ''}>{name}</span>
														{index < 9 && <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>}
													</DropdownMenuItem>
												);
											})}
										</DropdownMenuGroup>
										<DropdownMenuSeparator />
										<DropdownMenuItem className="gap-2 p-2" onClick={handleAddWorkspace}>
											<div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
												<Plus className="size-4" />
											</div>
											<div className="font-medium text-muted-foreground">
												{t('appLayout.addWorkspace', 'Add workspace')}
											</div>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarHeader>

					{/* Nav */}
					<SidebarContent>
						{/* Home + New Document + Quick Actions */}
						<SidebarGroup>
							<SidebarGroupContent>
								<SidebarMenu className="gap-1">
									<SidebarMenuItem>
										<SidebarMenuButton
											render={<Link to="/home" />}
											className="group/btn h-9 px-3"
											isActive={location.pathname === '/home'}
										>
											<Home className="h-5 w-5 shrink-0" />
											<span className="flex-1 truncate">{t('menu.home', 'Home')}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											className="group/btn h-9 px-3"
											onClick={createWriting}
											disabled={creatingWriting}
										>
											<Plus className="h-5 w-5 shrink-0" />
											<span className="flex-1 truncate">{t('sidebar.document', 'Document')}</span>
											<span className="text-sm text-muted-foreground/60 opacity-0 group-hover/btn:opacity-100 transition-opacity">
												{newDocumentShortcutLabel}
											</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											className="group/btn h-9 px-3"
											isActive={activeModal === 'search'}
											onClick={handleOpenSearch}
										>
											<Search className="h-5 w-5 shrink-0" />
											<span className="flex-1 truncate">{t('menu.search', 'Search')}</span>
											<span className="text-sm text-muted-foreground/60 opacity-0 group-hover/btn:opacity-100 transition-opacity">
												{searchShortcutLabel}
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
											<CollapsibleTrigger className="group/label cursor-pointer select-none hover:text-sidebar-foreground transition-colors" />
										}
									>
										{t('sidebar.writings')}
										<ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover/label:opacity-100 transition-all duration-200 group-data-[panel-open]/label:rotate-90" />
									</SidebarGroupLabel>
									<CollapsibleContent>
										<SidebarGroupContent>
											<SidebarMenu className="gap-1">
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
														<DropdownMenu>
															<DropdownMenuTrigger
																render={
																	<SidebarMenuAction
																		aria-label={t('sidebar.documentActions', 'Document actions')}
																		className="opacity-0 group-hover/menu-item:opacity-100 aria-expanded:opacity-100"
																	>
																		<MoreHorizontal />
																	</SidebarMenuAction>
																}
															/>
															<DropdownMenuContent side="right" align="start" className="w-44">
																<DropdownMenuItem>
																	<Pencil />
																	<span>{t('menu.rename', 'Rename')}</span>
																</DropdownMenuItem>
																<DropdownMenuSeparator />
																<DropdownMenuItem variant="destructive">
																	<Trash2 />
																	<span>{t('menu.delete', 'Delete')}</span>
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</SidebarMenuItem>
												))}
											</SidebarMenu>
										</SidebarGroupContent>
									</CollapsibleContent>
								</SidebarGroup>
							</Collapsible>
						)}

						<SidebarGroup className="mt-auto">
							<SidebarGroupLabel>{t('appLayout.resources', 'Resources')}</SidebarGroupLabel>
							<SidebarMenu>
								{[
									{ title: t('appLayout.images', 'Images'), icon: FileImage, items: [] },
									{ title: t('appLayout.video', 'Video'), icon: Video, items: [] },
									{ title: t('appLayout.audio', 'Audio'), icon: FileAudio, items: [] },
									{
										title: t('appLayout.knowledgeBase'),
										icon: Database,
										items: [
											{ title: t('appLayout.content'), url: '/resources/content' },
											{ title: t('appLayout.database'), url: '/resources/data' },
										],
									},
								].map((item) => (
									<Collapsible key={item.title} defaultOpen={false} className="group/collapsible">
										<SidebarMenuItem>
											<CollapsibleTrigger
												render={
													<SidebarMenuButton tooltip={item.title}>
														<item.icon />
														<span>{item.title}</span>
														<ChevronRight className="ml-auto transition-transform duration-200 group-data-[panel-open]/collapsible:rotate-90" />
													</SidebarMenuButton>
												}
											/>
											<CollapsibleContent>
												<SidebarMenuSub>
													{item.items.map((subItem) => (
														<SidebarMenuSubItem key={subItem.title}>
															<SidebarMenuSubButton
																render={subItem.url ? <Link to={subItem.url} /> : undefined}
																isActive={subItem.url ? location.pathname === subItem.url : false}
															>
																<span>{subItem.title}</span>
															</SidebarMenuSubButton>
														</SidebarMenuSubItem>
													))}
												</SidebarMenuSub>
											</CollapsibleContent>
										</SidebarMenuItem>
									</Collapsible>
								))}
							</SidebarMenu>
						</SidebarGroup>
					</SidebarContent>

					<SidebarFooter className="border-t p-2">
						<SidebarMenu>
							<SidebarMenuItem>
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<SidebarMenuButton
												size="lg"
												aria-label={t('appLayout.accountMenu', 'Open account menu')}
												className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
											>
												<Avatar className="h-8 w-8 rounded-lg">
													<AvatarImage src="" alt={footerUserName} />
													<AvatarFallback className="rounded-lg">
														{footerUserInitial}
													</AvatarFallback>
												</Avatar>
												<div className="grid flex-1 text-left text-sm leading-tight">
													<span className="truncate font-medium">{footerUserName}</span>
													<span className="truncate text-xs">{footerUserEmail}</span>
												</div>
												<ChevronsUpDown className="ml-auto size-4" />
											</SidebarMenuButton>
										}
									/>
									<DropdownMenuContent
										className="w-(--radix-dropdown-menu-trigger-width) min-w-72"
										side="top"
										align="end"
										sideOffset={0}
									>
										<DropdownMenuGroup className="space-y-1">
											<DropdownMenuLabel className="p-0 font-normal">
												<Item size="xs" className="px-1 py-1.5">
													<ItemMedia>
														<Avatar className="h-8 w-8 rounded-lg">
															<AvatarImage src="" alt={footerUserName} />
															<AvatarFallback className="rounded-lg">
																{footerUserInitial}
															</AvatarFallback>
														</Avatar>
													</ItemMedia>
													<ItemContent>
														<ItemTitle>{footerUserName}</ItemTitle>
														<p className="truncate text-xs text-muted-foreground">
															{footerUserEmail}
														</p>
													</ItemContent>
												</Item>
											</DropdownMenuLabel>
										</DropdownMenuGroup>
										<DropdownMenuSeparator />
										<DropdownMenuGroup className="space-y-1">
											{accountMenuItems.slice(0, 4).map(({ value, label, icon: Icon }) => (
												<React.Fragment key={value}>
													{value === 'language' ? (
														<DropdownMenuSub>
															<DropdownMenuSubTrigger className={ACCOUNT_MENU_ITEM_CLASS}>
																<Icon />
																<span className="flex-1">{label}</span>
															</DropdownMenuSubTrigger>
															<DropdownMenuSubContent className="min-w-40 p-1">
																<DropdownMenuRadioGroup
																	value={language}
																	onValueChange={handleLanguageChange}
																	className="space-y-1"
																>
																	{LANGUAGE_OPTIONS.map((option) => (
																		<DropdownMenuRadioItem
																			key={option.value}
																			value={option.value}
																			className={ACCOUNT_MENU_ITEM_CLASS}
																		>
																			{t(option.labelKey)}
																		</DropdownMenuRadioItem>
																	))}
																</DropdownMenuRadioGroup>
															</DropdownMenuSubContent>
														</DropdownMenuSub>
													) : (
														<DropdownMenuItem
															className={ACCOUNT_MENU_ITEM_CLASS}
															onClick={() => handleAccountMenuValueChange(value)}
														>
															<Icon />
															<span className="flex-1">{label}</span>
															{value === 'settings' && (
																<DropdownMenuShortcut>⇧⌘,</DropdownMenuShortcut>
															)}
														</DropdownMenuItem>
													)}
												</React.Fragment>
											))}
										</DropdownMenuGroup>
										<DropdownMenuSeparator />
										<DropdownMenuGroup className="space-y-1">
											{accountMenuItems.slice(4, 8).map(({ value, label, icon: Icon }) => (
												<DropdownMenuItem
													key={value}
													className={ACCOUNT_MENU_ITEM_CLASS}
													onClick={() => handleAccountMenuValueChange(value)}
												>
													<Icon />
													<span className="flex-1">{label}</span>
												</DropdownMenuItem>
											))}
										</DropdownMenuGroup>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											className={ACCOUNT_MENU_ITEM_CLASS}
											onClick={() => handleAccountMenuValueChange('logOut')}
										>
											<LogOut />
											{t('menu.logOut', 'Log out')}
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<Item size="xs" className="px-2 py-2">
											<ItemContent>
												<ItemTitle className="font-normal">{t('settings.theme.title')}</ItemTitle>
											</ItemContent>
											<ItemActions>
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
											</ItemActions>
										</Item>
									</DropdownMenuContent>
								</DropdownMenu>
							</SidebarMenuItem>
						</SidebarMenu>
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
			<CommandModalProvider>
				<Container>{children}</Container>
			</CommandModalProvider>
		</SidebarProvider>
	);
}
