import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorkspaceListener } from '../../../hooks/use-workspace-listener';
import { useWorkspaceValidation } from '../../../hooks/use-workspace-validation';
import { useCreateWriting } from '../../../hooks/use-create-writing';
import { useAppDispatch, useAppSelector } from '../../../store';
import { selectCurrentWorkspacePath, selectProjectName, selectWorkspaces, } from '../../../store/workspace/selectors';
import { loadCurrentWorkspace, loadProjectName, listWorkspaces, selectWorkspace, } from '../../../store/workspace/actions';
import { selectAllDocuments, documentAdded } from '../../../store/workspace';
import { TitleBar } from '../titlebar/TitleBar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarHeader, useSidebar, Sidebar, } from '@/components/ui/Sidebar';
import { AppIconOpenWriter } from '..';
import { Settings, ChevronRight, Search, Globe, LayoutDashboard, Bot, Plus, Sparkles, Sun, Monitor, Moon, MoreHorizontal, Pencil, Trash2, FileImage, FileText, Copy, GalleryVerticalEnd, EllipsisVertical, Plug, ArrowLeftRight, } from 'lucide-react';
import { SidebarPageContainer, SidebarPageInset } from '../sidebar/Sidebar';
import { DeleteConfirmDialog } from '../dialogs/DeleteConfirmDialog';
import { CommandModalProvider, useCommandModal } from '../command-modals';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { useAppActions } from '@/hooks/use-app-actions';
import { getShortcutLabel, ShortcutId } from '../../../../../shared/shortcuts';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuGroup, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, } from '@/components/ui/DropdownMenu';
import { useLanguageMode } from '@/hooks/use-language-mode';
const ACCOUNT_MENU_ITEM_CLASS = 'gap-3 px-2 py-2';
const LANGUAGE_OPTIONS = [
    { value: 'en', labelKey: 'settings.language.en' },
    { value: 'it', labelKey: 'settings.language.it' },
];
function Container({ children }) {
    const { t } = useTranslation();
    const { toggleSidebar, open } = useSidebar();
    const { activeModal, open: openCommandModal } = useCommandModal();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const handleNavigateBack = useCallback(() => navigate(-1), [navigate]);
    const handleNavigateForward = useCallback(() => navigate(1), [navigate]);
    const projectName = useAppSelector(selectProjectName);
    const currentWorkspacePath = useAppSelector(selectCurrentWorkspacePath);
    const workspaces = useAppSelector(selectWorkspaces);
    const themeMode = useThemeMode();
    const language = useLanguageMode();
    const { setTheme, setLanguage } = useAppActions();
    const shortcutPlatform = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')
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
    // Load current workspace, project name, and the full workspaces list on mount
    useEffect(() => {
        dispatch(loadCurrentWorkspace()).then(() => {
            dispatch(loadProjectName());
        });
        dispatch(listWorkspaces());
    }, [dispatch]);
    const workspaceNameFromPathString = (path) => {
        const parts = path.split(/[/\\]/);
        return parts[parts.length - 1] || path;
    };
    const handleSelectWorkspace = useCallback((path) => {
        if (path !== currentWorkspacePath) {
            dispatch(selectWorkspace(path));
        }
    }, [dispatch, currentWorkspacePath]);
    const handleAddWorkspace = useCallback(() => {
        navigate('/');
    }, [navigate]);
    const handleOpenSearch = useCallback(() => {
        openCommandModal('search');
    }, [openCommandModal]);
    // -------------------------------------------------------------------------
    // Documents list — sourced from Redux (loaded/watched at app startup)
    // -------------------------------------------------------------------------
    const documents = [...useAppSelector(selectAllDocuments)].sort((a, b) => b.createdAt - a.createdAt);
    // -------------------------------------------------------------------------
    // New document handler — optimistic Redux update
    // -------------------------------------------------------------------------
    const handleDocumentCreated = useCallback((result) => {
        dispatch(documentAdded({
            id: result.id,
            title: '',
            path: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }));
    }, [dispatch]);
    const { createWriting, isCreating: creatingWriting } = useCreateWriting({
        onCreated: handleDocumentCreated,
    });
    // -------------------------------------------------------------------------
    // Document deletion — Backspace on focused item or dropdown "Delete" action
    // -------------------------------------------------------------------------
    const [pendingDelete, setPendingDelete] = useState(null);
    const requestDeleteDocument = useCallback((doc) => {
        setPendingDelete(doc);
    }, []);
    const handleDuplicateDocument = useCallback(async (doc) => {
        const original = await window.workspace.loadOutput({ type: 'documents', id: doc.id });
        if (!original)
            return;
        const duplicateTitle = doc.title ? `${doc.title} (Copy)` : '';
        const result = await window.workspace.saveOutput({
            type: 'documents',
            content: original.content,
            metadata: { title: duplicateTitle },
        });
        dispatch(documentAdded({
            id: result.id,
            title: duplicateTitle,
            path: result.path,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }));
    }, [dispatch]);
    const handleDocumentKeyDown = useCallback((event, doc) => {
        if (event.key === 'Backspace' || event.key === 'Delete') {
            event.preventDefault();
            event.stopPropagation();
            requestDeleteDocument(doc);
        }
    }, [requestDeleteDocument]);
    const handleDocumentContextMenu = useCallback(async (event, doc) => {
        event.preventDefault();
        event.stopPropagation();
        const action = await window.app.showContextMenu([
            { id: 'rename', label: t('menu.rename', 'Rename') },
            { id: 'duplicate', label: t('menu.duplicate', 'Duplicate') },
            { id: 'delete', label: t('menu.delete', 'Delete'), destructive: true },
        ]);
        if (action === 'delete') {
            requestDeleteDocument(doc);
        }
        else if (action === 'duplicate') {
            handleDuplicateDocument(doc);
        }
    }, [requestDeleteDocument, handleDuplicateDocument, t]);
    const handleConfirmDelete = useCallback(async () => {
        if (!pendingDelete)
            return;
        const { id } = pendingDelete;
        setPendingDelete(null);
        await window.workspace.deleteOutput({ type: 'documents', id });
        if (location.pathname === `/content/${id}`) {
            const nextDocument = documents.find((doc) => doc.id !== id);
            if (nextDocument) {
                navigate(`/content/${nextDocument.id}`, { replace: true });
                requestAnimationFrame(() => {
                    const target = document.querySelector(`a[href="/content/${nextDocument.id}"]`);
                    target?.focus();
                });
            }
            else {
                navigate('/home', { replace: true });
            }
        }
    }, [pendingDelete, documents, location.pathname, navigate]);
    const handleDeleteDialogOpenChange = useCallback((open) => {
        if (!open)
            setPendingDelete(null);
    }, []);
    useEffect(() => {
        if (typeof window.app?.onShortcut !== 'function')
            return;
        return window.app.onShortcut((id) => {
            if (id === ShortcutId.newDocument) {
                createWriting();
            }
        });
    }, [createWriting]);
    const displayWorkspaceName = projectName || t('appLayout.untitledWorkspace', 'Untitled workspace');
    const sidebarTitle = projectName || t('appLayout.untitledWorkspace', 'Untitled workspace');
    const isLandingPage = location.pathname === '/';
    const [profile, setProfile] = useState(null);
    useEffect(() => {
        let cancelled = false;
        window.app.getProfile().then((p) => {
            if (!cancelled)
                setProfile(p);
        }).catch(() => { });
        return () => { cancelled = true; };
    }, []);
    const footerUserFirstName = profile?.firstName ?? '';
    const footerUserLastName = profile?.lastName ?? '';
    const footerUserName = `${footerUserFirstName} ${footerUserLastName}`.trim()
        || t('appLayout.unknownUser', 'User');
    const footerUserInitial = (footerUserFirstName || footerUserName).charAt(0).toUpperCase();
    const accountMenuItems = [
        {
            value: 'general',
            label: t('settings.tabs.general', 'General'),
            icon: Settings,
        },
        {
            value: 'workspace',
            label: t('settings.tabs.workspace', 'Workspace'),
            icon: GalleryVerticalEnd,
        },
        {
            value: 'providers',
            label: t('settings.tabs.providers', 'Providers'),
            icon: Plug,
        },
        {
            value: 'agents',
            label: t('settings.tabs.agents', 'Agents'),
            icon: Sparkles,
        },
        {
            value: 'editor',
            label: t('settings.tabs.editor', 'Editor'),
            icon: Pencil,
        },
        {
            value: 'system',
            label: t('settings.tabs.system', 'System'),
            icon: Monitor,
        },
    ];
    const handleAccountMenuValueChange = useCallback((value) => {
        switch (value) {
            case 'general':
                navigate('/settings/general');
                break;
            case 'workspace':
                navigate('/settings/workspace');
                break;
            case 'providers':
                navigate('/settings/providers');
                break;
            case 'agents':
                navigate('/settings/agents');
                break;
            case 'editor':
                navigate('/settings/editor');
                break;
            case 'system':
                navigate('/settings/system');
                break;
            case 'changeWorkspace':
                navigate('/');
                break;
            default:
                break;
        }
    }, [navigate]);
    const handleLanguageChange = useCallback((value) => {
        if (value === 'en' || value === 'it') {
            setLanguage(value);
        }
    }, [setLanguage]);
    const handleThemeChange = useCallback((value) => {
        if (value === 'light' || value === 'dark' || value === 'system') {
            setTheme(value);
        }
    }, [setTheme]);
    return (_jsxs(_Fragment, { children: [_jsx(TitleBar, { title: displayWorkspaceName, onToggleSidebar: toggleSidebar, onNavigateBack: isLandingPage ? undefined : handleNavigateBack, onNavigateForward: isLandingPage ? undefined : handleNavigateForward, showSidebarToggles: location.pathname.startsWith('/content/') }), _jsxs(SidebarPageContainer, { children: [_jsxs(Sidebar, { collapsible: "icon", className: "top-12 h-[calc(100svh-3rem)]", children: [_jsx(SidebarHeader, { children: _jsx(SidebarMenu, { children: _jsx(SidebarMenuItem, { children: _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { render: _jsxs(SidebarMenuButton, { size: "lg", children: [_jsx("div", { className: "flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground", children: _jsx(GalleryVerticalEnd, { className: "size-4" }) }), _jsxs("div", { className: "flex flex-col gap-1 leading-none", children: [_jsx("span", { className: "font-medium", children: "Workspace" }), _jsx("span", { className: "text-muted-foreground", children: sidebarTitle })] })] }) }), _jsxs(DropdownMenuContent, { className: "w-(--radix-dropdown-menu-trigger-width) min-w-72", side: "top", align: "end", sideOffset: 4, children: [_jsxs(DropdownMenuGroup, { children: [_jsx(DropdownMenuLabel, { className: "text-xs text-muted-foreground", children: t('appLayout.workspaces', 'Workspaces') }), workspaces.map((workspace) => {
                                                                    const name = workspace.name || workspaceNameFromPathString(workspace.path);
                                                                    const isActive = workspace.path === currentWorkspacePath;
                                                                    return (_jsxs(DropdownMenuItem, { onClick: () => handleSelectWorkspace(workspace.path), className: "gap-2 p-2", children: [_jsx("div", { className: "flex size-6 items-center justify-center rounded-md border", children: _jsx(AppIconOpenWriter, { className: "size-3.5 shrink-0" }) }), _jsx("span", { className: isActive ? 'font-medium' : '', children: name })] }, workspace.id));
                                                                })] }), _jsx(DropdownMenuSeparator, {}), _jsx(DropdownMenuGroup, { children: _jsxs(DropdownMenuItem, { className: "gap-2 p-2", onClick: handleAddWorkspace, children: [_jsx("div", { className: "flex size-6 items-center justify-center rounded-md border bg-transparent", children: _jsx(Plus, { className: "size-4" }) }), _jsx("div", { className: "font-medium text-muted-foreground", children: t('appLayout.addWorkspace', 'Add workspace') })] }) })] })] }) }) }) }), _jsxs(SidebarContent, { children: [_jsx(SidebarGroup, { children: _jsx(SidebarGroupContent, { children: _jsxs(SidebarMenu, { className: "gap-1", children: [_jsx(SidebarMenuItem, { children: _jsxs(SidebarMenuButton, { render: _jsx(Link, { to: "/home" }), className: "group/btn h-9 px-3", isActive: location.pathname === '/home', children: [_jsx("span", { className: "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-transparent", children: _jsx(LayoutDashboard, { className: "h-3.5 w-3.5" }) }), _jsx("span", { className: "flex-1 truncate", children: t('menu.home', 'Home') })] }) }), _jsx(SidebarMenuItem, { children: _jsxs(SidebarMenuButton, { render: _jsx(Link, { to: "/assistant" }), className: "group/btn h-9 px-3", isActive: location.pathname === '/assistant', children: [_jsx("span", { className: "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-transparent", children: _jsx(Bot, { className: "h-3.5 w-3.5" }) }), _jsx("span", { className: "flex-1 truncate", children: t('menu.assistant', 'Assistant') })] }) }), _jsx(SidebarMenuItem, { children: _jsxs(SidebarMenuButton, { className: "group/btn h-9 px-3", onClick: createWriting, disabled: creatingWriting, children: [_jsx("span", { className: "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sidebar-accent transition-colors group-hover/btn:bg-sidebar-primary group-hover/btn:text-sidebar-primary-foreground", children: _jsx(Plus, { className: "h-3.5 w-3.5" }) }), _jsx("span", { className: "flex-1 truncate", children: t('sidebar.document', 'Document') }), _jsx("span", { className: "text-sm text-muted-foreground/60 opacity-0 group-hover/btn:opacity-100 transition-opacity", children: newDocumentShortcutLabel })] }) }), _jsx(SidebarMenuItem, { children: _jsxs(SidebarMenuButton, { className: "group/btn h-9 px-3", isActive: activeModal === 'search', onClick: handleOpenSearch, children: [_jsx("span", { className: "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-transparent", children: _jsx(Search, { className: "h-3.5 w-3.5" }) }), _jsx("span", { className: "flex-1 truncate", children: t('menu.search', 'Search') }), _jsx("span", { className: "text-sm text-muted-foreground/60 opacity-0 group-hover/btn:opacity-100 transition-opacity", children: searchShortcutLabel })] }) })] }) }) }), open && (_jsx(Collapsible, { defaultOpen: true, className: "py-0", children: _jsxs(SidebarGroup, { className: "py-0", children: [_jsxs(SidebarGroupLabel, { className: "px-3", render: _jsx(CollapsibleTrigger, { className: "group/label cursor-pointer select-none hover:text-sidebar-foreground transition-colors" }), children: [t('sidebar.writings'), _jsx(ChevronRight, { className: "h-3.5 w-3.5 shrink-0 opacity-0 group-hover/label:opacity-100 transition-all duration-200 group-data-[panel-open]/label:rotate-90" })] }), _jsx(CollapsibleContent, { children: _jsx(SidebarGroupContent, { children: _jsx(SidebarMenu, { className: "gap-1", children: documents.map((w) => (_jsxs(SidebarMenuItem, { children: [_jsx(SidebarMenuButton, { render: _jsx(Link, { to: `/content/${w.id}` }), className: "h-9 px-3", isActive: location.pathname === `/content/${w.id}`, onKeyDown: (event) => handleDocumentKeyDown(event, { id: w.id, title: w.title }), onContextMenu: (event) => handleDocumentContextMenu(event, { id: w.id, title: w.title }), children: _jsx("span", { className: "flex-1 truncate", children: w.title || t('sidebar.untitledWriting') }) }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { render: _jsx(SidebarMenuAction, { "aria-label": t('sidebar.documentActions', 'Document actions'), className: "opacity-0 group-hover/menu-item:opacity-100 aria-expanded:opacity-100", children: _jsx(MoreHorizontal, {}) }) }), _jsxs(DropdownMenuContent, { side: "right", align: "start", className: "w-44", children: [_jsxs(DropdownMenuItem, { children: [_jsx(Pencil, {}), _jsx("span", { children: t('menu.rename', 'Rename') })] }), _jsxs(DropdownMenuItem, { onClick: () => handleDuplicateDocument({ id: w.id, title: w.title }), children: [_jsx(Copy, {}), _jsx("span", { children: t('menu.duplicate', 'Duplicate') })] }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuItem, { variant: "destructive", onClick: () => requestDeleteDocument({ id: w.id, title: w.title }), children: [_jsx(Trash2, {}), _jsx("span", { children: t('menu.delete', 'Delete') })] })] })] })] }, w.id))) }) }) })] }) })), _jsxs(SidebarGroup, { className: "mt-auto", children: [_jsx(SidebarGroupLabel, { className: "px-3", children: t('appLayout.resources', 'Resources') }), _jsxs(SidebarMenu, { className: "gap-1", children: [_jsx(SidebarMenuItem, { children: _jsxs(SidebarMenuButton, { render: _jsx(Link, { to: "/resources/content" }), className: "group/btn h-9 px-3", tooltip: t('appLayout.contents', 'Contents'), isActive: location.pathname === '/resources/content', children: [_jsx(FileText, {}), _jsx("span", { children: t('appLayout.contents', 'Contents') })] }) }), _jsx(SidebarMenuItem, { children: _jsxs(SidebarMenuButton, { render: _jsx(Link, { to: "/resources/images" }), className: "group/btn h-9 px-3", tooltip: t('appLayout.images', 'Images'), isActive: location.pathname === '/resources/images', children: [_jsx(FileImage, {}), _jsx("span", { children: t('appLayout.images', 'Images') })] }) })] })] })] }), _jsx(SidebarFooter, { children: _jsx(SidebarMenu, { children: _jsx(SidebarMenuItem, { children: _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { render: _jsxs(SidebarMenuButton, { size: "lg", className: "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground", children: [_jsxs(Avatar, { className: "h-8 w-8 rounded-full", children: [_jsx(AvatarImage, { alt: footerUserName }), _jsx(AvatarFallback, { className: "rounded-full", children: footerUserInitial })] }), _jsx("div", { className: "grid flex-1 text-left text-sm leading-tight", children: _jsx("span", { className: "truncate font-medium", children: footerUserName }) }), _jsx(EllipsisVertical, { className: "ml-auto size-4" })] }) }), _jsxs(DropdownMenuContent, { className: "w-(--radix-dropdown-menu-trigger-width) min-w-72", side: "right", align: "end", sideOffset: 4, children: [_jsx(DropdownMenuGroup, { children: _jsx(DropdownMenuLabel, { className: "flex flex-col gap-0.5 font-normal", children: _jsx("span", { className: "text-sm font-medium", children: footerUserName }) }) }), _jsx(DropdownMenuSeparator, {}), _jsx(DropdownMenuGroup, { className: "space-y-1", children: accountMenuItems.map(({ value, label, icon: Icon }) => (_jsxs(DropdownMenuItem, { className: ACCOUNT_MENU_ITEM_CLASS, onClick: () => handleAccountMenuValueChange(value), children: [_jsx(Icon, {}), _jsx("span", { className: "flex-1", children: label })] }, value))) }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuSub, { children: [_jsxs(DropdownMenuSubTrigger, { className: ACCOUNT_MENU_ITEM_CLASS, children: [_jsx(Sun, {}), _jsx("span", { className: "flex-1", children: t('settings.theme.title') })] }), _jsx(DropdownMenuSubContent, { className: "min-w-40 p-1", children: _jsxs(DropdownMenuGroup, { className: "space-y-1", children: [_jsx(DropdownMenuLabel, { className: "text-xs text-muted-foreground", children: t('settings.theme.title') }), _jsxs(DropdownMenuRadioGroup, { value: themeMode, onValueChange: handleThemeChange, className: "space-y-1", children: [_jsxs(DropdownMenuRadioItem, { value: "light", className: ACCOUNT_MENU_ITEM_CLASS, children: [_jsx(Sun, {}), _jsx("span", { className: "flex-1", children: t('settings.theme.light', 'Light') })] }), _jsxs(DropdownMenuRadioItem, { value: "system", className: ACCOUNT_MENU_ITEM_CLASS, children: [_jsx(Monitor, {}), _jsx("span", { className: "flex-1", children: t('settings.theme.system', 'System') })] }), _jsxs(DropdownMenuRadioItem, { value: "dark", className: ACCOUNT_MENU_ITEM_CLASS, children: [_jsx(Moon, {}), _jsx("span", { className: "flex-1", children: t('settings.theme.dark', 'Dark') })] })] })] }) })] }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuSub, { children: [_jsxs(DropdownMenuSubTrigger, { className: ACCOUNT_MENU_ITEM_CLASS, children: [_jsx(Globe, {}), _jsx("span", { className: "flex-1", children: t('menu.language', 'Language') })] }), _jsx(DropdownMenuSubContent, { className: "min-w-40 p-1", children: _jsxs(DropdownMenuGroup, { className: "space-y-1", children: [_jsx(DropdownMenuLabel, { className: "text-xs text-muted-foreground", children: t('menu.language', 'Language') }), _jsx(DropdownMenuRadioGroup, { value: language, onValueChange: handleLanguageChange, className: "space-y-1", children: LANGUAGE_OPTIONS.map((option) => (_jsx(DropdownMenuRadioItem, { value: option.value, className: ACCOUNT_MENU_ITEM_CLASS, children: t(option.labelKey) }, option.value))) })] }) })] }), _jsx(DropdownMenuSeparator, {}), _jsx(DropdownMenuGroup, { children: _jsxs(DropdownMenuItem, { className: ACCOUNT_MENU_ITEM_CLASS, onClick: () => handleAccountMenuValueChange('changeWorkspace'), children: [_jsx(ArrowLeftRight, {}), _jsx("span", { className: "flex-1", children: t('appLayout.changeWorkspace', 'Change workspace') })] }) })] })] }) }) }) })] }), _jsx(SidebarPageInset, { children: children })] }), _jsx(DeleteConfirmDialog, { open: pendingDelete !== null, onOpenChange: handleDeleteDialogOpenChange, title: t('sidebar.deleteDocumentTitle', 'Delete document?'), description: t('sidebar.deleteDocumentDescription', {
                    defaultValue: '"{{title}}" will be permanently removed from this workspace. This action cannot be undone.',
                    title: pendingDelete?.title || t('sidebar.untitledWriting'),
                }), onConfirm: handleConfirmDelete })] }));
}
export function Layout({ children }) {
    return (_jsx(SidebarProvider, { className: "flex-col flex-1 min-h-0 flex h-screen min-w-200 overflow-x-hidden", style: { '--sidebar-width': '18rem' }, children: _jsx(CommandModalProvider, { children: _jsx(Container, { children: children }) }) }));
}
