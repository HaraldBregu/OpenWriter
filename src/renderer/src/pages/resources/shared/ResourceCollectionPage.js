import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/app';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { useAppDispatch, useAppSelector } from '@/store';
import { importResourcesRequested, loadIndexingInfo, removeResources, selectCurrentWorkspacePath, selectImporting, selectIndexingInfo, selectResources, selectResourcesError, selectResourcesStatus, } from '@/store/workspace';
import { ResourceEmptyState } from './ResourceEmptyState';
import { ResourceSectionHeader } from './ResourceSectionHeader';
import { filterResourcesBySection, RESOURCE_SECTIONS, } from './resource-sections';
import { ResourceTable } from './ResourceTable';
export function ResourceCollectionPage({ sectionId }) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const section = RESOURCE_SECTIONS[sectionId];
    const allResources = useAppSelector(selectResources);
    const status = useAppSelector(selectResourcesStatus);
    const error = useAppSelector(selectResourcesError);
    const uploading = useAppSelector(selectImporting);
    const workspacePath = useAppSelector(selectCurrentWorkspacePath);
    const indexingInfo = useAppSelector(selectIndexingInfo);
    const resources = useMemo(() => filterResourcesBySection(allResources, sectionId), [allResources, sectionId]);
    const [indexingTaskId, setIndexingTaskId] = useState(null);
    const [indexingStatus, setIndexingStatus] = useState(null);
    const indexingTaskCompleted = indexingStatus === 'finished';
    const indexingTaskActive = indexingStatus === 'queued' || indexingStatus === 'started' || indexingStatus === 'running';
    useEffect(() => {
        if (!section.supportsIndexing)
            return;
        if (typeof window.task?.list !== 'function')
            return;
        window.task.list().then((res) => {
            if (!res.success)
                return;
            const active = res.data.find((t) => t.type === 'index-resources' &&
                (t.status === 'queued' || t.status === 'started' || t.status === 'running'));
            if (active) {
                setIndexingTaskId(active.taskId);
                setIndexingStatus(active.status);
            }
        });
    }, [section.supportsIndexing]);
    useEffect(() => {
        if (!section.supportsIndexing)
            return;
        if (typeof window.task?.onEvent !== 'function')
            return;
        return window.task.onEvent((event) => {
            if (indexingTaskId && event.taskId === indexingTaskId) {
                setIndexingStatus(event.state);
            }
        });
    }, [indexingTaskId, section.supportsIndexing]);
    const loading = status === 'idle' || status === 'loading';
    const indexing = section.supportsIndexing && indexingTaskActive;
    const [editing, setEditing] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [removing, setRemoving] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    useEffect(() => {
        if (section.supportsIndexing) {
            dispatch(loadIndexingInfo());
        }
    }, [dispatch, section.supportsIndexing]);
    useEffect(() => {
        if (section.supportsIndexing && indexingTaskCompleted) {
            dispatch(loadIndexingInfo());
        }
    }, [dispatch, indexingTaskCompleted, section.supportsIndexing]);
    useEffect(() => {
        setSelected((current) => {
            const resourceIds = new Set(resources.map((resource) => resource.id));
            const nextSelected = new Set([...current].filter((id) => resourceIds.has(id)));
            const hasChanged = nextSelected.size !== current.size || [...current].some((id) => !resourceIds.has(id));
            return hasChanged ? nextSelected : current;
        });
    }, [resources]);
    const handleIndex = useCallback(async () => {
        if (!section.supportsIndexing || !workspacePath || indexing) {
            return;
        }
        const res = await window.task.submit({
            type: 'index-resources',
            input: {
                workspacePath,
            },
            metadata: {},
        });
        if (res.success) {
            setIndexingTaskId(res.data.taskId);
            setIndexingStatus('queued');
        }
    }, [indexing, section.supportsIndexing, workspacePath]);
    const handleUpload = useCallback(() => {
        dispatch(importResourcesRequested(section.uploadExtensions));
    }, [dispatch, section.uploadExtensions]);
    const handleToggleEdit = useCallback(() => {
        setEditing((current) => {
            if (current) {
                setSelected(new Set());
            }
            return !current;
        });
    }, []);
    const handleConfirmRemove = useCallback(async () => {
        setConfirmOpen(false);
        const ids = [...selected];
        if (ids.length === 0) {
            return;
        }
        setRemoving(true);
        try {
            await dispatch(removeResources(ids)).unwrap();
            setSelected(new Set());
        }
        finally {
            setRemoving(false);
        }
    }, [dispatch, selected]);
    const handleOpenDataFolder = useCallback(() => {
        window.workspace.openDataFolder();
    }, []);
    const handleOpenResourcesFolder = useCallback(() => {
        window.workspace.openWorkspaceFolder();
    }, []);
    return (_jsxs(PageContainer, { children: [_jsx(ResourceSectionHeader, { title: t(section.titleKey), uploading: uploading, uploadLabel: t(section.uploadKey), onUpload: handleUpload, editing: editing, onToggleEdit: handleToggleEdit, selectedCount: selected.size, removing: removing, onRemove: () => setConfirmOpen(true), indexing: indexing, showIndexButton: section.supportsIndexing, onIndex: handleIndex, onOpenFolder: handleOpenResourcesFolder }), indexing && (_jsx("div", { className: "border-b px-6 py-3 shrink-0", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin text-primary" }), _jsx("span", { className: "text-sm text-muted-foreground", children: t('resources.media.indexing') })] }) })), section.supportsIndexing && !indexing && indexingInfo && (_jsx("div", { className: "border-b px-6 py-3 shrink-0", children: _jsxs("div", { className: "flex items-center gap-4 text-xs text-muted-foreground", children: [_jsxs("span", { children: [t('library.lastIndexed'), " ", new Date(indexingInfo.lastIndexedAt).toLocaleString()] }), _jsxs("span", { children: [indexingInfo.indexedCount, " ", t('library.documents')] }), _jsxs("span", { children: [indexingInfo.totalChunks, " ", t('library.chunks')] }), indexingInfo.failedCount > 0 && (_jsxs("span", { className: "text-destructive", children: [indexingInfo.failedCount, " ", t('library.failed')] })), _jsx(Button, { variant: "ghost", size: "icon-xs", className: "ml-auto", onClick: handleOpenDataFolder, children: _jsx(FolderOpen, {}) })] }) })), _jsxs("div", { className: "flex flex-1 min-h-0 flex-col overflow-y-auto p-6", children: [loading && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-muted-foreground", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), _jsx("span", { children: t(section.loadingKey) })] })), error && (_jsx("div", { className: "rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive", children: error })), !loading && !error && resources.length === 0 && (_jsx(ResourceEmptyState, { icon: section.icon, message: t(section.emptyKey), uploadLabel: t(section.uploadKey), uploading: uploading, onUpload: handleUpload })), !loading && !error && resources.length > 0 && (_jsx(ResourceTable, { resources: resources, searchPlaceholder: t(section.searchPlaceholderKey), editing: editing, selected: selected, onSelectedChange: setSelected }))] }), _jsx(AlertDialog, { open: confirmOpen, onOpenChange: setConfirmOpen, children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: t('resources.removeItems') }), _jsx(AlertDialogDescription, { children: t('resources.removeConfirm', { count: selected.size }) })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: t('common.cancel') }), _jsx(AlertDialogAction, { className: "bg-destructive text-destructive-foreground hover:bg-destructive/90", onClick: handleConfirmRemove, children: t('resources.remove') })] })] }) })] }));
}
