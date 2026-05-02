import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useAppDispatch } from '@/store';
import { loadProjectName } from '@/store/workspace/actions';
import { SectionHeader, SettingRow } from '../components';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso) {
    return new Date(iso).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const WorkspacePage = () => {
    const { t } = useTranslation();
    const reduxDispatch = useAppDispatch();
    const [currentWorkspace, setCurrentWorkspace] = useState(null);
    const [projectInfo, setProjectInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [draft, setDraft] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const descriptionInputRef = useRef(null);
    // ---- Load workspace data ------------------------------------------------
    useEffect(() => {
        let cancelled = false;
        Promise.all([window.workspace.getCurrent(), window.workspace.getProjectInfo()])
            .then(([workspace, info]) => {
            if (cancelled)
                return;
            setCurrentWorkspace(workspace);
            setProjectInfo(info);
        })
            .catch(() => {
            if (!cancelled)
                setLoadError(true);
        })
            .finally(() => {
            if (!cancelled)
                setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    // ---- Edit handlers ------------------------------------------------------
    const handleStartEdit = useCallback((field) => {
        if (!projectInfo)
            return;
        setSaveError(false);
        setEditingField(field);
        setDraft(field === 'name' ? projectInfo.name : projectInfo.description);
    }, [projectInfo]);
    const handleCancel = useCallback(() => {
        setEditingField(null);
        setDraft('');
        setSaveError(false);
    }, []);
    const handleCommit = useCallback(() => {
        if (!editingField || !projectInfo)
            return;
        const trimmed = draft.trim();
        const current = editingField === 'name' ? projectInfo.name : projectInfo.description;
        if (trimmed === (current ?? '')) {
            setEditingField(null);
            return;
        }
        setIsSaving(true);
        const apiCall = editingField === 'name'
            ? window.workspace.updateProjectName(trimmed)
            : window.workspace.updateProjectDescription(trimmed);
        apiCall
            .then((updated) => {
            setProjectInfo(updated);
            setEditingField(null);
            reduxDispatch(loadProjectName());
        })
            .catch(() => {
            setSaveError(true);
        })
            .finally(() => {
            setIsSaving(false);
        });
    }, [editingField, draft, projectInfo, reduxDispatch]);
    const handleEditKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCommit();
        }
        else if (e.key === 'Escape') {
            handleCancel();
        }
    }, [handleCommit, handleCancel]);
    // Focus input when description editing starts
    useEffect(() => {
        if (editingField === 'description' && descriptionInputRef.current) {
            descriptionInputRef.current.focus();
            const len = descriptionInputRef.current.value.length;
            descriptionInputRef.current.setSelectionRange(len, len);
        }
    }, [editingField]);
    // ---- Render -------------------------------------------------------------
    return (_jsxs("div", { className: "w-full max-w-2xl", "aria-busy": isSaving, children: [_jsx("h1", { className: "text-lg font-normal mb-6", children: t('workspacePage.title') }), loadError && (_jsx("p", { className: "text-sm text-destructive mb-4", role: "alert", children: t('workspacePage.loadError') })), saveError && (_jsx("p", { className: "text-sm text-destructive mb-4", role: "alert", children: t('workspacePage.saveError') })), _jsx(SectionHeader, { title: t('workspacePage.sections.baseInfo') }), _jsx(SettingRow, { label: t('workspacePage.path'), description: t('workspacePage.pathDescription'), children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-mono text-xs truncate max-w-xs inline-block text-muted-foreground", title: currentWorkspace ?? t('workspacePage.notSet'), "aria-live": "polite", "aria-atomic": "true", children: isLoading
                                ? t('workspacePage.loading')
                                : (currentWorkspace ?? t('workspacePage.notSet')) }), !isLoading && currentWorkspace && (_jsx("button", { type: "button", onClick: () => window.workspace.openWorkspaceFolder(), className: "shrink-0 rounded p-1 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors", "aria-label": t('common.openFolder'), title: t('common.openFolder'), children: _jsx(FolderOpen, { className: "h-3.5 w-3.5", "aria-hidden": "true" }) }))] }) }), !isLoading && currentWorkspace && projectInfo && (_jsxs(_Fragment, { children: [_jsx(SettingRow, { label: t('workspacePage.name'), description: t('workspacePage.nameDescription'), children: editingField === 'name' ? (_jsx(Input, { autoFocus: true, value: draft, onChange: (e) => setDraft(e.target.value), onBlur: handleCommit, onKeyDown: handleEditKeyDown, disabled: isSaving, className: "h-7 px-2 py-0 text-sm w-56", "aria-label": t('workspacePage.namePlaceholder') })) : (_jsx("button", { type: "button", onClick: () => handleStartEdit('name'), className: "text-sm truncate max-w-[14rem] text-right hover:text-foreground hover:underline underline-offset-2 transition-colors cursor-text", title: projectInfo.name || t('workspacePage.namePlaceholder'), "aria-label": `${t('common.edit')} ${t('workspacePage.name')}: ${projectInfo.name || t('workspacePage.namePlaceholder')}`, children: projectInfo.name || (_jsx("span", { className: "text-muted-foreground italic", children: t('workspacePage.namePlaceholder') })) })) }), _jsx(SettingRow, { label: t('workspacePage.descriptionLabel'), description: t('workspacePage.descriptionDescription'), children: editingField === 'description' ? (_jsx(Input, { ref: descriptionInputRef, value: draft, onChange: (e) => setDraft(e.target.value), onBlur: handleCommit, onKeyDown: handleEditKeyDown, disabled: isSaving, className: "h-7 px-2 py-0 text-sm w-56", "aria-label": t('workspacePage.descriptionPlaceholder') })) : (_jsx("button", { type: "button", onClick: () => handleStartEdit('description'), className: "text-sm text-right max-w-[14rem] truncate hover:text-foreground hover:underline underline-offset-2 transition-colors cursor-text", title: projectInfo.description || t('workspacePage.descriptionPlaceholder'), "aria-label": `${t('common.edit')} ${t('workspacePage.descriptionLabel')}: ${projectInfo.description || t('workspacePage.descriptionPlaceholder')}`, children: projectInfo.description || (_jsx("span", { className: "text-muted-foreground italic", children: t('workspacePage.descriptionPlaceholder') })) })) }), _jsx(SettingRow, { label: t('workspacePage.projectId'), description: t('workspacePage.projectIdDescription'), children: _jsx("span", { className: "font-mono text-xs text-muted-foreground truncate max-w-[14rem] inline-block", children: projectInfo.projectId }) }), _jsx(SectionHeader, { title: t('workspacePage.sections.versioning') }), _jsx(SettingRow, { label: t('workspacePage.schemaVersion'), description: t('workspacePage.schemaVersionDescription'), children: _jsx("span", { className: "font-mono text-sm", children: projectInfo.version }) }), _jsx(SettingRow, { label: t('workspacePage.appVersion'), description: t('workspacePage.appVersionDescription'), children: _jsx("span", { className: "font-mono text-sm", children: projectInfo.appVersion }) }), _jsx(SettingRow, { label: t('workspacePage.createdAt'), description: t('workspacePage.createdAtDescription'), children: _jsx("span", { className: "text-sm", children: formatDate(projectInfo.createdAt) }) }), _jsx(SettingRow, { label: t('workspacePage.updatedAt'), description: t('workspacePage.updatedAtDescription'), children: _jsx("span", { className: "text-sm", children: formatDate(projectInfo.updatedAt) }) })] }))] }));
};
export default WorkspacePage;
