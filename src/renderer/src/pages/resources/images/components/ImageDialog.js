import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Calendar, File, FolderOpen, HardDrive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from '@/components/ui/Dialog';
import { Separator } from '@/components/ui/Separator';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { MIME_PREFIX_IMAGE } from '../../shared/resource-preview-utils';
import { formatBytes, formatDate } from '../../shared/resource-utils';
import { useContext } from '../hooks/use-context';
import { useDelete } from '../hooks/use-delete';
import { DetailRow } from './DetailRow';
import { PreviewLoading, PreviewError } from './PreviewStates';
function useBlobUrl(path, mimeType) {
    const [blobUrl, setBlobUrl] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        let objectUrl = null;
        setLoading(true);
        setError(null);
        setBlobUrl(null);
        window.workspace
            .readFile({ filePath: path, encoding: 'latin1' })
            .then((raw) => {
            if (cancelled)
                return;
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i += 1) {
                bytes[i] = raw.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: mimeType });
            objectUrl = URL.createObjectURL(blob);
            setBlobUrl(objectUrl);
        })
            .catch((err) => {
            if (!cancelled) {
                setError(err instanceof Error ? err.message : 'Failed to load preview');
            }
        })
            .finally(() => {
            if (!cancelled) {
                setLoading(false);
            }
        });
        return () => {
            cancelled = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [mimeType, path]);
    return { blobUrl, error, loading };
}
function ImagePreview({ path, mimeType }) {
    const { blobUrl, error, loading } = useBlobUrl(path, mimeType);
    if (error)
        return _jsx(PreviewError, { message: error });
    if (loading || !blobUrl)
        return _jsx(PreviewLoading, {});
    return (_jsx("div", { className: "flex h-full items-center justify-center rounded-md bg-muted/20 p-4", children: _jsx("img", { src: blobUrl, alt: "", className: "max-h-full max-w-full rounded object-contain" }) }));
}
export function ImageDialog() {
    const { activeFile, fileDetailsOpen, handleFileDetailsOpenChange, handleOpenFolder } = useContext();
    const handleDelete = useDelete({
        activeFile,
        onDeleted: () => handleFileDetailsOpenChange(false),
    });
    if (!activeFile || !activeFile.mimeType.startsWith(MIME_PREFIX_IMAGE)) {
        return null;
    }
    return (_jsx(Dialog, { open: fileDetailsOpen, onOpenChange: handleFileDetailsOpenChange, children: _jsx(DialogContent, { className: "flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col", children: _jsxs(DialogHeader, { className: "contents space-y-0 text-left", children: [_jsx(DialogTitle, { className: "truncate", children: activeFile.name }), _jsx(DialogDescription, { render: _jsx("div", {}), className: "flex min-h-0 flex-1", children: _jsxs("div", { className: "flex h-full min-h-0 w-full gap-0", children: [_jsx("div", { className: "flex min-h-0 flex-1 flex-col overflow-hidden border-r", children: _jsx(ScrollArea, { className: "h-full flex-1 p-4", children: _jsx(ImagePreview, { path: activeFile.path, mimeType: activeFile.mimeType }) }) }), _jsx("div", { className: "flex w-96 shrink-0 flex-col", children: _jsx(ScrollArea, { className: "flex-1", children: _jsxs("div", { className: "space-y-4 p-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "mb-3 text-sm font-semibold", children: "Details" }), _jsxs("div", { className: "space-y-3", children: [_jsx(DetailRow, { icon: _jsx(HardDrive, { className: "h-4 w-4" }), label: "Size", value: formatBytes(activeFile.size) }), _jsx(DetailRow, { icon: _jsx(File, { className: "h-4 w-4" }), label: "Type", value: activeFile.mimeType }), _jsx(DetailRow, { icon: _jsx(Calendar, { className: "h-4 w-4" }), label: "Added", value: formatDate(activeFile.createdAt) }), _jsx(DetailRow, { icon: _jsx(Calendar, { className: "h-4 w-4" }), label: "Modified", value: formatDate(activeFile.modifiedAt) })] })] }), _jsx(Separator, {}), _jsxs("div", { children: [_jsx("h3", { className: "mb-3 text-sm font-semibold", children: "Location" }), _jsx("p", { className: "break-all text-xs text-muted-foreground", title: activeFile.path, children: activeFile.relativePath })] }), _jsx(Separator, {}), _jsxs("div", { children: [_jsx("h3", { className: "mb-3 text-sm font-semibold", children: "Actions" }), _jsxs("div", { className: "space-y-2", children: [_jsxs(Button, { variant: "outline", className: "w-full justify-start", onClick: handleOpenFolder, children: [_jsx(FolderOpen, { className: "mr-2 h-4 w-4" }), "Open in Folder"] }), _jsxs(Button, { variant: "outline", className: "w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive", onClick: () => void handleDelete(), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete File"] })] })] })] }) }) })] }) })] }) }) }));
}
