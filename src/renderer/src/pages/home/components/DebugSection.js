import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { ListTodo, Database, ScrollText } from 'lucide-react';
import { useDebugDialogs } from '@/contexts/DebugDialogsContext';
import { CategoryCard } from './CategoryCard';
export function DebugSection() {
    const { t } = useTranslation();
    const { openTasksDialog, openReduxDialog, openLogDialog } = useDebugDialogs();
    return (_jsxs("section", { className: "space-y-3", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: t('debug.title', 'Debug') }), _jsxs("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-3", children: [_jsx(CategoryCard, { icon: ListTodo, labelKey: "debug.tasks", descriptionKey: "home.tasksDescription", accent: "bg-foreground/8 text-foreground", onClick: openTasksDialog }), _jsx(CategoryCard, { icon: Database, labelKey: "appLayout.redux", descriptionKey: "home.reduxDescription", accent: "bg-muted text-foreground", onClick: openReduxDialog }), _jsx(CategoryCard, { icon: ScrollText, labelKey: "home.logs", descriptionKey: "home.logsDescription", accent: "bg-secondary text-foreground", onClick: openLogDialog })] })] }));
}
