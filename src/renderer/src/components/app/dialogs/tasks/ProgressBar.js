import { jsx as _jsx } from "react/jsx-runtime";
export function ProgressBar({ percent }) {
    return (_jsx("div", { className: "w-20 bg-muted rounded-full h-1.5", children: _jsx("div", { className: "bg-primary h-1.5 rounded-full transition-all", style: { width: `${Math.min(100, Math.max(0, percent))}%` } }) }));
}
