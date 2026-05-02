import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Clock, Plus, X, AlertTriangle } from 'lucide-react';
import { AppIconOpenWriter } from '@/components/app';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { H4, Muted, Small } from '@/components/ui/Typography';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/Dialog';
import { TitleBar } from '@/components/app/titlebar/TitleBar';
import { useWorkspaceDeletionReason, useClearDeletionReason, } from '@/hooks/use-workspace-validation';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectWorkspace, listWorkspaces, createWorkspace } from '@/store/workspace/actions';
import { selectWorkspaces } from '@/store/workspace/selectors';
const WelcomePage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const workspaces = useAppSelector(selectWorkspaces);
    const deletionReason = useWorkspaceDeletionReason();
    const clearDeletion = useClearDeletionReason();
    const [createOpen, setCreateOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    useEffect(() => {
        void dispatch(listWorkspaces());
    }, [dispatch]);
    const openCreateDialog = useCallback(() => {
        setName('');
        setDescription('');
        setSubmitError(null);
        setCreateOpen(true);
    }, []);
    const handleCreate = useCallback(async (event) => {
        event.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) {
            setSubmitError(t('welcome.workspaceNamePlaceholder'));
            return;
        }
        setSubmitting(true);
        setSubmitError(null);
        try {
            await dispatch(createWorkspace({ name: trimmedName, description: description.trim() })).unwrap();
            setCreateOpen(false);
            navigate('/home');
        }
        catch (err) {
            setSubmitError(err instanceof Error ? err.message : String(err));
        }
        finally {
            setSubmitting(false);
        }
    }, [dispatch, name, description, navigate, t]);
    const handleOpenWorkspace = useCallback(async (path) => {
        try {
            await dispatch(selectWorkspace(path)).unwrap();
            navigate('/home');
        }
        catch (error) {
            console.error('Failed to open workspace:', error);
        }
    }, [dispatch, navigate]);
    const formatRelativeTime = (timestamp) => {
        if (!timestamp)
            return '';
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60)
            return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60)
            return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24)
            return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days === 1)
            return 'yesterday';
        if (days < 7)
            return `${days}d ago`;
        return `${Math.floor(days / 7)}w ago`;
    };
    return (_jsxs("div", { className: "flex flex-col h-screen bg-background", children: [_jsx(TitleBar, { title: "OpenWriter" }), deletionReason && (_jsxs("div", { className: "mx-8 mt-4 mb-0 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3", children: [_jsx(AlertTriangle, { className: "h-4 w-4 shrink-0 text-destructive" }), _jsx("p", { className: "flex-1 text-sm text-foreground", children: deletionReason === 'inaccessible'
                            ? t('workspace.inaccessibleBanner')
                            : t('workspace.deletedBanner') }), _jsx("button", { onClick: clearDeletion, "aria-label": t('common.close'), className: "h-6 w-6 rounded-md hover:bg-destructive/10 flex items-center justify-center transition-colors shrink-0", children: _jsx(X, { className: "h-3.5 w-3.5 text-destructive", "aria-hidden": "true" }) })] })), _jsxs("div", { className: "flex flex-col items-center flex-1 px-8 py-12 overflow-y-auto", children: [_jsxs("div", { className: "flex flex-col items-center mb-8", children: [_jsx(AppIconOpenWriter, { className: "mb-3 text-foreground", style: {
                                    width: 'clamp(48px, min(8vw, 8vh), 72px)',
                                    height: 'clamp(48px, min(8vw, 8vh), 72px)',
                                }, "aria-label": t('appTitle'), role: "img" }), _jsx(H4, { className: "mb-1 text-foreground", children: t('appTitle') }), _jsx(Muted, { className: "text-center max-w-xs leading-relaxed", children: t('welcome.tagline') }), _jsxs(Small, { className: "mt-2 font-normal text-muted-foreground", children: [t('welcome.freePlan'), " \u2022", ' ', _jsx("span", { className: "text-primary cursor-pointer hover:underline", children: t('welcome.upgradeToPro') })] })] }), _jsx("div", { className: "w-full max-w-2xl mb-8", children: _jsxs("div", { className: "rounded-xl border border-border p-6 flex items-center justify-between gap-6", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(H4, { className: "text-foreground", children: t('welcome.createWorkspace') }), _jsx(Muted, { children: t('welcome.createWorkspaceDescription') })] }), _jsxs(Button, { className: "h-14 px-6 flex items-center gap-3 rounded-lg shrink-0", onClick: openCreateDialog, children: [_jsx(Plus, { className: "h-5 w-5" }), _jsx("span", { className: "text-sm font-medium", children: t('welcome.create') })] })] }) }), _jsxs("div", { className: "w-full max-w-2xl flex flex-col min-h-0", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx(Small, { className: "uppercase tracking-widest text-muted-foreground", children: t('welcome.yourWorkspaces') }), workspaces.length > 5 && (_jsx(Small, { className: "font-normal text-muted-foreground hover:text-foreground cursor-pointer transition-colors", children: t('welcome.viewAll') }))] }), workspaces.length === 0 ? (_jsx("div", { className: "rounded-xl border border-dashed border-border px-4 py-8 text-center", children: _jsx(Muted, { children: t('welcome.noWorkspaces') }) })) : (_jsx("div", { className: "rounded-xl border border-border overflow-y-auto max-h-96", children: workspaces.slice(0, 5).map((workspace, index) => {
                                    const displayName = workspace.name || workspace.id;
                                    return (_jsxs("button", { onClick: () => handleOpenWorkspace(workspace.path), className: `
                      flex items-center justify-between w-full px-4 py-3 text-left
                      transition-colors hover:bg-accent
                      ${index !== 0 ? 'border-t border-border' : ''}
                    `, children: [_jsxs("div", { className: "flex items-center gap-4 flex-1 min-w-0", children: [_jsx("div", { className: "h-8 w-8 rounded-md flex items-center justify-center shrink-0 bg-primary/10", children: _jsx(FolderOpen, { className: "h-4 w-4 text-primary" }) }), _jsxs("div", { className: "flex flex-col items-start min-w-0", children: [_jsx("span", { className: "text-sm font-medium truncate text-foreground text-left", children: displayName }), workspace.description && (_jsx("span", { className: "text-xs truncate mt-0.5 text-muted-foreground text-left", children: workspace.description }))] })] }), workspace.lastOpened > 0 && (_jsxs("div", { className: "flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 ml-3", children: [_jsx(Clock, { className: "h-3 w-3" }), _jsx("span", { children: formatRelativeTime(workspace.lastOpened) })] }))] }, workspace.id));
                                }) }))] })] }), _jsx(Dialog, { open: createOpen, onOpenChange: setCreateOpen, children: _jsx(DialogContent, { children: _jsxs("form", { onSubmit: handleCreate, children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: t('welcome.createWorkspace') }), _jsx(DialogDescription, { children: t('welcome.createWorkspaceDescription') })] }), _jsxs("div", { className: "grid gap-4 py-4", children: [_jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { htmlFor: "workspace-name", children: t('welcome.workspaceName') }), _jsx(Input, { id: "workspace-name", autoFocus: true, value: name, placeholder: t('welcome.workspaceNamePlaceholder'), onChange: (e) => setName(e.target.value), disabled: submitting, required: true, maxLength: 255 })] }), _jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { htmlFor: "workspace-description", children: t('welcome.workspaceDescription') }), _jsx(Textarea, { id: "workspace-description", value: description, placeholder: t('welcome.workspaceDescriptionPlaceholder'), onChange: (e) => setDescription(e.target.value), disabled: submitting, rows: 3 })] }), submitError && _jsx("p", { className: "text-xs text-destructive", children: submitError })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => setCreateOpen(false), disabled: submitting, children: t('welcome.cancel') }), _jsx(Button, { type: "submit", disabled: submitting || !name.trim(), children: t('welcome.create') })] })] }) }) })] }));
};
export default WelcomePage;
