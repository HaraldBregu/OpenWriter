import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Loader2 } from 'lucide-react';
export function PreviewLoading() {
    return (_jsxs("div", { className: "flex h-full items-center justify-center text-sm text-muted-foreground", children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Loading preview..."] }));
}
export function PreviewError({ message }) {
    return (_jsx("div", { className: "flex h-full items-center justify-center", children: _jsx("div", { className: "rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive", children: message }) }));
}
