import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, } from '@/components/ui/Dialog';
import { formatEventTime } from './task-helpers';
export function TaskDataDialog({ task, open, onOpenChange }) {
    const { t } = useTranslation();
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-2xl", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: task?.type || t('debug.unknown') }), _jsx(DialogDescription, { className: "font-mono text-xs", children: task ? task.taskId : '' })] }), _jsx("div", { className: "max-h-[60vh] overflow-y-auto space-y-1.5", children: !task || task.events.length === 0 ? (_jsx("p", { className: "text-xs text-muted-foreground text-center py-8", children: t('debug.noEventsYet') })) : ([...task.events].reverse().map((ev, i) => {
                        const event = {
                            state: ev.state,
                            taskId: ev.data.taskId,
                            data: ev.data.data,
                            metadata: ev.data.metadata,
                        };
                        return (_jsxs("div", { className: "rounded border bg-background p-2 text-xs", children: [_jsxs("div", { className: "flex items-center justify-between mb-1 gap-2", children: [_jsx("span", { className: "font-medium shrink-0", children: ev.state }), _jsx("span", { className: "text-muted-foreground shrink-0", children: formatEventTime(ev.receivedAt) })] }), _jsx("pre", { className: "text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all text-[10px] leading-relaxed", children: JSON.stringify(event, null, 2) })] }, i));
                    })) })] }) }));
}
