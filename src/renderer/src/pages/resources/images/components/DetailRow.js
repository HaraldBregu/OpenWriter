import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function DetailRow({ icon, label, value }) {
    return (_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "mt-0.5 text-muted-foreground", children: icon }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-xs text-muted-foreground", children: label }), _jsx("p", { className: "truncate text-sm", children: value })] })] }));
}
