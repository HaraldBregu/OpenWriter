import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { FolderOpen, Upload } from 'lucide-react';
import { TextDialog } from './components/TextDialog';
import { ImageDialog } from './components/ImageDialog';
import { PdfDialog } from './components/PdfDialog';
import { DeleteConfirmDialog, ImagePreviewDialog } from '@/components/app/dialogs';
import { useContext } from './hooks/use-context';
import { PageBody, PageContainer, PageHeader, PageHeaderTitle } from '@/components/app/base/page';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import Layout from './Layout';
function toLocalResourceUrl(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    const withSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
    const encoded = withSlash
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');
    return `local-resource://localhost${encoded}`;
}
const PAGE_TITLES = {
    all: 'Images',
    image: 'Images',
    video: 'Images',
    audio: 'Images',
    json: 'Images',
    markdown: 'Images',
    text: 'Images',
    pdf: 'Images',
};
function PageContent() {
    const { filteredEntries, uploading, typeFilter, handleUpload, handleOpenFolder, selected, confirmOpen, setConfirmOpen, handleConfirmDelete, } = useContext();
    const [preview, setPreview] = useState(null);
    const pageTitle = PAGE_TITLES[typeFilter];
    const fileCount = selected.size;
    const fileDescription = fileCount === 1
        ? 'This will permanently delete 1 file. This action cannot be undone.'
        : `This will permanently delete ${fileCount} files. This action cannot be undone.`;
    return (_jsxs(PageContainer, { children: [_jsx(PageHeader, { children: _jsxs(PageHeaderTitle, { children: [_jsx(Label, { className: "w-full text-left text-sm font-medium", children: pageTitle }), _jsxs(Button, { variant: "outline", size: "md", onClick: handleUpload, disabled: uploading, "aria-label": "Upload", title: "Upload", children: [_jsx(Upload, { "aria-hidden": "true" }), _jsx("span", { children: "Upload" })] }), _jsxs(Button, { variant: "outline", size: "md", onClick: handleOpenFolder, "aria-label": "Open folder", title: "Open folder", children: [_jsx(FolderOpen, { "aria-hidden": "true" }), _jsx("span", { children: "Folder" })] })] }) }), _jsx(PageBody, { children: filteredEntries.length === 0 ? (_jsx("div", { className: "flex flex-1 items-center justify-center py-16", children: _jsx("p", { className: "text-sm text-muted-foreground", children: "No images yet." }) })) : (_jsx("div", { className: "grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8", children: filteredEntries.map((image) => {
                        const src = toLocalResourceUrl(image.path);
                        return (_jsx("img", { className: "aspect-square w-full cursor-pointer rounded-lg object-cover object-center", src: src, alt: image.name, title: image.name, onClick: () => setPreview({ src, alt: image.name }) }, image.id));
                    }) })) }), _jsx(ImageDialog, {}), _jsx(PdfDialog, {}), _jsx(TextDialog, {}), _jsx(DeleteConfirmDialog, { open: confirmOpen, onOpenChange: setConfirmOpen, title: "Delete files", description: fileDescription, onConfirm: handleConfirmDelete }), _jsx(ImagePreviewDialog, { open: preview !== null, onOpenChange: (open) => {
                    if (!open)
                        setPreview(null);
                }, src: preview?.src ?? null, alt: preview?.alt ?? null })] }));
}
export default function Page() {
    return (_jsx(Layout, { children: _jsx(PageContent, {}) }));
}
