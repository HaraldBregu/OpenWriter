import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { entryCount } from './redux-helpers';
export function SliceSection({ name, data }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const json = JSON.stringify(data, null, 2);
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(json);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, [json]);
    return (_jsxs("div", { className: "border rounded-lg overflow-hidden", children: [_jsxs("button", { type: "button", onClick: () => setOpen((o) => !o), className: "flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors", children: [open ? (_jsx(ChevronDown, { className: "h-4 w-4 shrink-0" })) : (_jsx(ChevronRight, { className: "h-4 w-4 shrink-0" })), _jsx("span", { className: "text-sm font-medium", children: name }), _jsx("span", { className: "text-xs text-muted-foreground ml-auto", children: entryCount(data) })] }), open && (_jsxs("div", { className: "border-t relative", children: [_jsx("button", { type: "button", onClick: handleCopy, title: t('debug.copyToClipboard'), className: "absolute top-2 right-2 p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground", children: copied ? (_jsx(Check, { className: "h-3.5 w-3.5 text-success" })) : (_jsx(Copy, { className: "h-3.5 w-3.5" })) }), _jsx("pre", { className: "p-4 pr-10 text-xs font-mono overflow-auto max-h-96 bg-muted/20 text-muted-foreground whitespace-pre-wrap break-all", children: json })] }))] }));
}
