import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, ListTree, Pencil, Trash2, Upload } from 'lucide-react';
import { PageHeader, PageHeaderTitle } from '@/components/app';
import { Button } from '@/components/ui/Button';
export const ResourceSectionHeader = memo(function ResourceSectionHeader({ title, uploading, uploadLabel, onUpload, editing, onToggleEdit, selectedCount, removing, onRemove, indexing, showIndexButton, onIndex, onOpenFolder, }) {
    const { t } = useTranslation();
    return (_jsx(PageHeader, { children: _jsxs(PageHeaderTitle, { children: [title, editing && selectedCount > 0 && (_jsxs(Button, { variant: "destructive", size: "lg", disabled: removing, onClick: onRemove, children: [_jsx(Trash2, {}), t('resources.removeWithCount', { count: selectedCount })] })), _jsx(Button, { variant: "outline", size: "lg", onClick: onOpenFolder, disabled: editing, children: _jsx(FolderOpen, {}) }), showIndexButton && (_jsx(Button, { variant: "outline", size: "lg", onClick: onIndex, disabled: indexing || editing, children: _jsx(ListTree, {}) })), _jsxs(Button, { variant: "outline", size: "lg", onClick: onUpload, disabled: uploading || editing, title: uploadLabel, children: [_jsx(Upload, {}), uploadLabel] }), _jsx(Button, { variant: editing ? 'secondary' : 'outline', size: "lg", onClick: onToggleEdit, children: _jsx(Pencil, {}) })] }) }));
});
