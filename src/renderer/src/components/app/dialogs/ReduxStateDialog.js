import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, RefreshCw } from 'lucide-react';
import { useAppSelector } from '@/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { SliceSection } from './redux/SliceSection';
export function ReduxStateDialog({ open, onOpenChange }) {
    const { t } = useTranslation();
    const [live, setLive] = useState(false);
    const [tick, setTick] = useState(0);
    const intervalRef = useRef(null);
    useEffect(() => {
        if (live) {
            intervalRef.current = setInterval(() => setTick((v) => v + 1), 1000);
        }
        return () => {
            if (intervalRef.current)
                clearInterval(intervalRef.current);
        };
    }, [live]);
    const workspace = useAppSelector((s) => s.workspace);
    void tick;
    const slices = [{ name: 'workspace', data: workspace }];
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col p-0 gap-0", children: [_jsx(DialogHeader, { className: "px-6 py-3 border-b shrink-0", children: _jsxs(DialogTitle, { className: "flex items-center gap-2 text-lg font-semibold", children: [_jsx(Database, { className: "h-5 w-5 text-muted-foreground" }), t('appLayout.redux', 'Redux')] }) }), _jsxs("div", { className: "flex-1 overflow-auto p-6 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { type: "button", onClick: () => setTick((v) => v + 1), className: "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors", children: [_jsx(RefreshCw, { className: "h-3 w-3" }), t('debug.refresh')] }), _jsxs("label", { className: "inline-flex items-center gap-1.5 text-xs cursor-pointer select-none", children: [_jsx("input", { type: "checkbox", checked: live, onChange: (e) => setLive(e.target.checked), className: "rounded border-muted-foreground" }), t('debug.live')] })] }), slices.map(({ name, data }) => (_jsx(SliceSection, { name: name, data: data }, name)))] })] }) }));
}
