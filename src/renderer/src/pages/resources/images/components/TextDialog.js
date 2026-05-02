import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Calendar, File, FolderOpen, HardDrive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from '@/components/ui/Dialog';
import { Separator } from '@/components/ui/Separator';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { MIME_PREFIX_IMAGE, MIME_TYPE_JSON, MIME_TYPE_PDF, } from '../../shared/resource-preview-utils';
import { formatBytes, formatDate } from '../../shared/resource-utils';
import { useContext } from '../hooks/use-context';
import { useDelete } from '../hooks/use-delete';
import { DetailRow } from './DetailRow';
import { PreviewLoading, PreviewError } from './PreviewStates';
function JsonPreview({ content }) {
    const formatted = useMemo(() => {
        try {
            return JSON.stringify(JSON.parse(content), null, 2);
        }
        catch {
            return content;
        }
    }, [content]);
    return (_jsx("pre", { className: "whitespace-pre-wrap break-words rounded-md bg-muted/30 p-4 font-mono text-sm text-foreground", children: formatted }));
}
export function TextDialog() {
    const { activeFile, fileDetailsOpen, handleFileDetailsOpenChange, handleOpenFolder } = useContext();
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const shouldReadContent = activeFile !== null && activeFile.mimeType === MIME_TYPE_JSON;
    useEffect(() => {
        if (!activeFile || !shouldReadContent) {
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
            .readFile({ filePath: activeFile.path })
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
    }, [activeFile, shouldReadContent]);
    const handleDeleteSingle = useDelete({
        activeFile,
        onDeleted: () => handleFileDetailsOpenChange(false),
    });
    if (!activeFile ||
        activeFile.mimeType.startsWith(MIME_PREFIX_IMAGE) ||
        activeFile.mimeType === MIME_TYPE_PDF) {
        return null;
    }
    return (_jsx(Dialog, { open: fileDetailsOpen, onOpenChange: handleFileDetailsOpenChange, children: _jsx(DialogContent, { className: "flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col", children: _jsxs(DialogHeader, { className: "contents space-y-0 text-left", children: [_jsx(DialogTitle, { className: "truncate", children: activeFile.name }), _jsx(DialogDescription, { render: _jsx("div", {}), className: "flex min-h-0 flex-1", children: _jsxs("div", { className: "flex h-full min-h-0 w-full gap-0", children: [_jsx("div", { className: "flex min-h-0 flex-1 flex-col overflow-hidden border-r", children: _jsxs(ScrollArea, { className: "h-full flex-1 p-4", children: [loading && _jsx(PreviewLoading, {}), error && _jsx(PreviewError, { message: error }), !loading &&
                                                !error &&
                                                activeFile.mimeType === MIME_TYPE_JSON &&
                                                content !== null && _jsx(JsonPreview, { content: content })] }) }), _jsx("div", { className: "flex w-96 shrink-0 flex-col", children: _jsx(ScrollArea, { className: "flex-1", children: _jsxs("div", { className: "space-y-4 p-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "mb-3 text-sm font-semibold", children: "Details" }), _jsxs("div", { className: "space-y-3", children: [_jsx(DetailRow, { icon: _jsx(HardDrive, { className: "h-4 w-4" }), label: "Size", value: formatBytes(activeFile.size) }), _jsx(DetailRow, { icon: _jsx(File, { className: "h-4 w-4" }), label: "Type", value: activeFile.mimeType }), _jsx(DetailRow, { icon: _jsx(Calendar, { className: "h-4 w-4" }), label: "Added", value: formatDate(activeFile.createdAt) }), _jsx(DetailRow, { icon: _jsx(Calendar, { className: "h-4 w-4" }), label: "Modified", value: formatDate(activeFile.modifiedAt) })] })] }), _jsx(Separator, {}), _jsxs("div", { children: [_jsx("h3", { className: "mb-3 text-sm font-semibold", children: "Location" }), _jsx("p", { className: "break-all text-xs text-muted-foreground", title: activeFile.path, children: activeFile.relativePath })] }), _jsx(Separator, {}), _jsxs("div", { children: [_jsx("h3", { className: "mb-3 text-sm font-semibold", children: "Actions" }), _jsxs("div", { className: "space-y-2", children: [_jsxs(Button, { variant: "outline", className: "w-full justify-start", onClick: handleOpenFolder, children: [_jsx(FolderOpen, { className: "mr-2 h-4 w-4" }), "Open in Folder"] }), _jsxs(Button, { variant: "outline", className: "w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive", onClick: () => void handleDeleteSingle(), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete File"] })] })] })] }) }) })] }) })] }) }) }));
}
