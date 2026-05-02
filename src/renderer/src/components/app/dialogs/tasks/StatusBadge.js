import { jsx as _jsx } from "react/jsx-runtime";
import { STATUS_CONFIG } from './task-constants';
export function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? {
        label: status,
        className: 'border border-border bg-muted/70 text-muted-foreground',
    };
    return (_jsx("span", { className: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`, children: cfg.label }));
}
