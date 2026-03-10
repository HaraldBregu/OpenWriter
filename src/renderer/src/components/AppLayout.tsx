import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
	AppPopover,
	AppPopoverContent,
	AppPopoverTrigger,
	AppSeparator,
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
	AppSidebarFooter,
	useSidebar,
} from './app';
import logoIcon from '@resources/icons/icon.png';
import {
	Settings,
	User,
	Shield,
	LogOut,
	CreditCard,
	HelpCircle,
	ChevronRight,
	Bell,
	Bug,
	Bot,
	PenLine,
	Plus,
	FileText,
} from 'lucide-react';

interface AppLayoutProps {
	readonly children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Settings popover menu items
// ---------------------------------------------------------------------------

interface SettingsMenuItem {
	titleKey: string;
	icon: React.ElementType;
	url?: string;
	danger?: boolean;
	divider?: boolean;
}

const settingsMenuItems: SettingsMenuItem[] = [
	{ titleKey: 'menu.account', icon: User },
	{ titleKey: 'menu.settings', icon: Settings, url: '/settings' },
	{ titleKey: 'menu.notifications', icon: Bell },
	{ titleKey: 'menu.privacy', icon: Shield },
	{ titleKey: 'menu.billing', icon: CreditCard },
	{ titleKey: 'menu.helpAndSupport', icon: HelpCircle },
];

// ---------------------------------------------------------------------------
// SettingsPopover
// ---------------------------------------------------------------------------

// Stub — replace with real auth state
const currentUser: { name: string } | null = { name: 'John Doe' };

const SettingsPopover = React.memo(function SettingsPopover() {
	const { t } = useTranslation();
	return (
		<AppPopover>
			<AppPopoverTrigger asChild>
				<button
					type="button"
					className="flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
				>
					<span className="flex-1 truncate text-sm text-left">
						{currentUser ? currentUser.name : t('common.signIn')}
					</span>
					<ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
				</button>
			</AppPopoverTrigger>
			<AppPopoverContent side="top" align="start" className="w-64 p-0">
				<div className="py-1">
					{settingsMenuItems.map((item) => {
						const Icon = item.icon;
						const label = t(item.titleKey);
						const className =
							'flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors';
						return item.url ? (
							<Link key={item.titleKey} to={item.url} className={className}>
								<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
								<span>{label}</span>
							</Link>
						) : (
							<button key={item.titleKey} type="button" className={className}>
								<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
								<span>{label}</span>
							</button>
						);
					})}

					{currentUser && (
						<>
							<AppSeparator className="my-1" />
							<button
								type="button"
								className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
							>
								<LogOut className="h-4 w-4 shrink-0" />
								<span>{t('common.logOut')}</span>
							</button>
						</>
					)}
				</div>
			</AppPopoverContent>
		</AppPopover>
	);
});
SettingsPopover.displayName = 'SettingsPopover';

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
	const [writingsOpen, setWritingsOpen] = useState(true);

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
											<span className="flex-1 truncate">
												{t('sidebar.newWriting') || 'New Writing'}
											</span>
										</AppSidebarMenuButton>
									</AppSidebarMenuItem>
								</AppSidebarMenu>
							</AppSidebarGroupContent>
						</AppSidebarGroup>

						<AppSidebarSeparator className="my-1" />

						{/* Writings collapsible group */}
						<AppSidebarGroup className="py-0">
							<AppSidebarGroupLabel
								className="cursor-pointer select-none hover:text-sidebar-foreground transition-colors"
								onClick={() => setWritingsOpen((prev) => !prev)}
							>
								{t('sidebar.writings') || 'Writings'}
								<ChevronRight
									className={`h-3 w-3 shrink-0 transition-transform duration-200 mr-1 ${writingsOpen ? 'rotate-90' : ''}`}
								/>
							</AppSidebarGroupLabel>
							{writingsOpen && (
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
														<PenLine className="h-3.5 w-3.5 shrink-0" />
														<span className="flex-1 truncate">
															{w.title || t('sidebar.untitledWriting') || 'Untitled'}
														</span>
													</Link>
												</AppSidebarMenuButton>
											</AppSidebarMenuItem>
										))}
									</AppSidebarMenu>
								</AppSidebarGroupContent>
							)}
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
												<span className="flex-1 truncate">Debug</span>
											</Link>
										</AppSidebarMenuButton>
									</AppSidebarMenuItem>

									<AppSidebarMenuItem>
										<AppSidebarMenuButton
											asChild
											className="h-9 px-3"
											isActive={location.pathname === '/agents'}
										>
											<Link to="/agents">
												<Bot className="h-3.5 w-3.5 shrink-0" />
												<span className="flex-1 truncate">{t('common.agents') || 'Agents'}</span>
											</Link>
										</AppSidebarMenuButton>
									</AppSidebarMenuItem>
								</AppSidebarMenu>
							</AppSidebarGroupContent>
						</AppSidebarGroup>
					</AppSidebarContent>

					{/* Footer — Settings popover */}
					<AppSidebarFooter className="border-t px-3 py-3">
						<SettingsPopover />
					</AppSidebarFooter>
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
