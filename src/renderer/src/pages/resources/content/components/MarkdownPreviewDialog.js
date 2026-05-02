import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
export function MarkdownPreviewDialog({ item, open, onOpenChange, }) {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!open || !item) {
            setContent(null);
            setError(null);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        setContent(null);
        window.workspace
            .readFile({ filePath: item.path })
            .then((text) => {
            if (!cancelled)
                setContent(text);
        })
            .catch((err) => {
            if (!cancelled) {
                setError(err instanceof Error ? err.message : 'Failed to read file');
            }
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [open, item]);
    if (!item)
        return null;
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsx(DialogContent, { className: "flex h-[70vh] min-w-[calc(100vw-60rem)] max-w-none flex-col", children: _jsxs(DialogHeader, { className: "contents space-y-0 text-left", children: [_jsx(DialogTitle, { className: "truncate", children: item.name }), _jsx(DialogDescription, { render: _jsx("div", {}), className: "flex min-h-0 flex-1", children: _jsx(ScrollArea, { className: "h-full w-full", children: _jsxs("div", { className: "p-6", children: [loading && _jsx("p", { className: "text-sm text-muted-foreground", children: "Loading\u2026" }), error && _jsx("p", { className: "text-sm text-destructive", children: error }), !loading && !error && content !== null && (_jsx("div", { className: "prose prose-sm max-w-none text-foreground dark:prose-invert", children: _jsx(Markdown, { remarkPlugins: [remarkGfm], children: content }) }))] }) }) })] }) }) }));
}
