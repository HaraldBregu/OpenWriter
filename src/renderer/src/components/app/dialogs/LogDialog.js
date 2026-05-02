import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollText, RefreshCw, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
const LEVEL_STYLES = {
    DEBUG: 'text-muted-foreground bg-muted/50',
    INFO: 'text-[hsl(var(--info))] bg-[hsl(var(--info)/0.12)] dark:text-[hsl(var(--info))] dark:bg-[hsl(var(--info)/0.18)]',
    WARN: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.14)] dark:text-[hsl(var(--warning))] dark:bg-[hsl(var(--warning)/0.18)]',
    ERROR: 'text-destructive bg-destructive/10',
};
const LEVEL_OPTIONS = [
    { value: 'ALL', label: 'All' },
    { value: 'DEBUG', label: 'Debug' },
    { value: 'INFO', label: 'Info' },
    { value: 'WARN', label: 'Warn' },
    { value: 'ERROR', label: 'Error' },
];
const FETCH_LIMIT = 500;
const AUTO_REFRESH_MS = 3000;
export function LogDialog({ open, onOpenChange }) {
    const { t } = useTranslation();
    const [entries, setEntries] = useState([]);
    const [filterLevel, setFilterLevel] = useState('ALL');
    const [search, setSearch] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [loading, setLoading] = useState(false);
    const intervalRef = useRef(null);
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const result = await window.app.getLogs(FETCH_LIMIT);
            setEntries(result);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        if (open)
            fetchLogs();
    }, [open, fetchLogs]);
    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(fetchLogs, AUTO_REFRESH_MS);
        }
        else if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [autoRefresh, fetchLogs]);
    const filtered = entries
        .filter((e) => {
        if (filterLevel !== 'ALL' && e.level !== filterLevel)
            return false;
        if (search) {
            const q = search.toLowerCase();
            return (e.source.toLowerCase().includes(q) ||
                e.message.toLowerCase().includes(q) ||
                e.level.toLowerCase().includes(q));
        }
        return true;
    })
        .reverse();
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col p-0 gap-0", children: [_jsx(DialogHeader, { className: "px-6 py-3 border-b shrink-0", children: _jsxs(DialogTitle, { className: "flex items-center gap-2 text-lg font-semibold", children: [_jsx(ScrollText, { className: "h-5 w-5 text-muted-foreground" }), t('debug.logs', 'Logs')] }) }), _jsxs("div", { className: "flex items-center gap-2 px-4 py-2 border-b shrink-0 bg-background", children: [_jsx(Input, { type: "text", placeholder: t('debug.logsSearch', 'Search logs…'), value: search, onChange: (e) => setSearch(e.target.value), className: "h-8 flex-1 min-w-0 text-sm" }), _jsxs(Select, { value: filterLevel, onValueChange: (v) => setFilterLevel(v), children: [_jsx(SelectTrigger, { className: "h-8 w-28 text-sm", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: LEVEL_OPTIONS.map((opt) => (_jsx(SelectItem, { value: opt.value, children: opt.label }, opt.value))) })] }), _jsxs(Button, { variant: autoRefresh ? 'default' : 'outline', size: "sm", onClick: () => setAutoRefresh((v) => !v), "aria-pressed": autoRefresh, children: [_jsx(RefreshCw, { className: autoRefresh ? 'animate-spin' : '' }), t('debug.autoRefresh', 'Auto-refresh')] }), _jsx(Button, { variant: "ghost", size: "icon-xs", onClick: fetchLogs, disabled: loading, "aria-label": t('debug.refresh', 'Refresh'), children: _jsx(RefreshCw, { className: loading ? 'animate-spin' : '' }) }), _jsx(Button, { variant: "ghost", size: "icon-xs", onClick: () => window.app.openLogsFolder(), "aria-label": t('debug.openLogsFolder', 'Open logs folder'), children: _jsx(FolderOpen, {}) })] }), _jsxs("div", { className: "flex items-center gap-4 px-4 py-1.5 border-b shrink-0 text-xs text-muted-foreground bg-muted/30", children: [_jsxs("span", { children: [_jsx("span", { className: "font-medium text-foreground", children: filtered.length }), ' ', t('debug.logsShown', 'shown')] }), entries.length !== filtered.length && (_jsxs("span", { children: [t('debug.logsOf', 'of'), ' ', _jsx("span", { className: "font-medium text-foreground", children: entries.length }), ' ', t('debug.total', 'total')] }))] }), _jsx("div", { className: "flex-1 overflow-auto font-mono text-xs", children: filtered.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-muted-foreground gap-3", children: [_jsx(ScrollText, { className: "h-10 w-10 opacity-20" }), _jsx("p", { className: "text-sm font-sans", children: t('debug.noLogsYet', 'No log entries yet') })] })) : (_jsxs("table", { className: "w-full text-left border-collapse", children: [_jsx("thead", { className: "sticky top-0 bg-background border-b z-10", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider w-[180px]", children: t('debug.logsTimestamp', 'Timestamp') }), _jsx("th", { className: "px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider w-[64px]", children: t('debug.logsLevel', 'Level') }), _jsx("th", { className: "px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider w-[160px]", children: t('debug.logsSource', 'Source') }), _jsx("th", { className: "px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider", children: t('debug.logsMessage', 'Message') })] }) }), _jsx("tbody", { children: filtered.map((entry, idx) => (_jsxs("tr", { className: "border-b border-border/50 hover:bg-muted/30 transition-colors", children: [_jsx("td", { className: "px-4 py-1.5 text-muted-foreground whitespace-nowrap", children: entry.timestamp }), _jsx("td", { className: "px-4 py-1.5 whitespace-nowrap", children: _jsx("span", { className: `inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${LEVEL_STYLES[entry.level]}`, children: entry.level }) }), _jsx("td", { className: "px-4 py-1.5 text-muted-foreground whitespace-nowrap truncate max-w-[160px]", children: entry.source }), _jsx("td", { className: "px-4 py-1.5 break-all", children: entry.message })] }, idx))) })] })) })] }) }));
}
