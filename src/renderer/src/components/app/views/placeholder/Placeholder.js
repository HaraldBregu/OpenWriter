import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import { ImageIcon } from 'lucide-react';
import { FileUpload, FileUploadDropzone } from '@/components/ui/FileUpload';
const IMAGE_MIME_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';
export function Placeholder({ nodeViewProps }) {
    const { editor, node, getPos, extension } = nodeViewProps;
    const deleteNode = useCallback(() => {
        const pos = getPos();
        if (typeof pos !== 'number')
            return;
        editor
            .chain()
            .focus()
            .deleteRange({ from: pos, to: pos + node.nodeSize })
            .run();
    }, [editor, getPos, node.nodeSize]);
    const handleFileAccept = useCallback((file) => {
        const options = extension.options;
        deleteNode();
        options.onImageInsert?.(file, null);
    }, [deleteNode, extension.options]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            deleteNode();
        }
    }, [deleteNode]);
    return (_jsx("div", { className: "my-4", children: _jsx(FileUpload, { accept: IMAGE_MIME_ACCEPT, maxFiles: 1, onFileAccept: handleFileAccept, label: "Select an image to insert", children: _jsxs(FileUploadDropzone, { className: "flex-col gap-2 px-6 py-10 text-sm text-muted-foreground", onKeyDown: handleKeyDown, children: [_jsx(ImageIcon, { className: "h-8 w-8 shrink-0 opacity-60" }), _jsx("span", { children: "Drag & drop an image or click to select" })] }) }) }));
}
