import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useState } from 'react';
export function CollapsibleSection({ title, children }) {
    const [open, setOpen] = useState(false);
    const panelId = useId();
    return (_jsxs("div", { children: [_jsxs("button", { onClick: () => setOpen((v) => !v), "aria-expanded": open, "aria-controls": panelId, className: "flex w-full items-center justify-between px-6 py-4 text-sm font-normal hover:bg-muted/40 transition-colors", children: [_jsx("span", { children: title }), _jsx("span", { className: "text-muted-foreground text-xs", "aria-hidden": "true", children: open ? '\u25B2' : '\u25BC' })] }), open && (_jsx("div", { id: panelId, className: "border-t", children: children }))] }));
}
