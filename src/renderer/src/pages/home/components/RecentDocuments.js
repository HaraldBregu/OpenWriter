import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Clock3, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, } from '@/components/ui/Empty';
import { useAppSelector } from '@/store';
import { selectAllDocuments } from '@/store/workspace';
import { formatRelativeTime } from '../shared/format-time';
const MAX_RECENT = 8;
export function RecentDocuments() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const allDocuments = useAppSelector(selectAllDocuments);
    const recentDocuments = [...allDocuments]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_RECENT);
    return (_jsxs("section", { className: "space-y-3", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: t('home.recent', 'Recent') }) }), recentDocuments.length === 0 ? (_jsx(Empty, { className: "border border-border bg-card", children: _jsxs(EmptyHeader, { children: [_jsx(EmptyMedia, { variant: "icon", children: _jsx(FolderOpen, {}) }), _jsx(EmptyTitle, { children: t('home.noRecentWritings', 'No writings yet. Create one to get started.') }), _jsx(EmptyDescription, { children: t('home.noRecentWritingsHint', 'Your recent documents will appear here.') })] }) })) : (_jsx(Card, { className: "overflow-hidden p-0", children: recentDocuments.map((doc, index) => (_jsxs("button", { type: "button", onClick: () => navigate(`/content/${doc.id}`), className: `group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${index !== 0 ? 'border-t border-border' : ''}`, children: [_jsx("div", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted", children: _jsx(FolderOpen, { className: "h-4 w-4 text-muted-foreground" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-medium text-foreground", children: doc.title || t('sidebar.untitledWriting', 'Untitled') }), _jsx("p", { className: "mt-0.5 truncate text-xs text-muted-foreground", children: doc.path })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground", children: [_jsx(Clock3, { className: "h-3.5 w-3.5" }), _jsx("span", { children: formatRelativeTime(doc.updatedAt) })] }), _jsx(ArrowRight, { className: "h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" })] }, doc.id))) }))] }));
}
