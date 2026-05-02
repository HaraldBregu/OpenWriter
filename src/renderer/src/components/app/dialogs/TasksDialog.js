import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { Bug } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { TasksTab } from './tasks/TasksTab';
export function TasksDialog({ open, onOpenChange }) {
    const { t } = useTranslation();
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col p-0 gap-0", children: [_jsx(DialogHeader, { className: "px-6 py-3 border-b shrink-0", children: _jsxs(DialogTitle, { className: "flex items-center gap-2 text-lg font-semibold", children: [_jsx(Bug, { className: "h-5 w-5 text-muted-foreground" }), t('debug.tasks')] }) }), _jsx("div", { className: "flex flex-1 min-h-0", children: _jsx(TasksTab, {}) })] }) }));
}
