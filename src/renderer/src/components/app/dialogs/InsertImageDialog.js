import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/Select';
import { ImagePlus, Upload } from 'lucide-react';
import { fileToDataUri } from '../editor/plugins/image-drop-paste-plugin';
const MAX_PREVIEW_HEIGHT = 160;
export function InsertImageDialog({ open, onOpenChange, onInsert, }) {
    const { t } = useTranslation();
    const [source, setSource] = useState('url');
    const [url, setUrl] = useState('');
    const [alt, setAlt] = useState('');
    const [title, setTitle] = useState('');
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const reset = useCallback(() => {
        setSource('url');
        setUrl('');
        setAlt('');
        setTitle('');
        setPreview(null);
        setError(null);
    }, []);
    const handleOpenChange = useCallback((nextOpen) => {
        if (!nextOpen)
            reset();
        onOpenChange(nextOpen);
    }, [onOpenChange, reset]);
    const handleSourceChange = useCallback((value) => {
        if (value === null)
            return;
        setSource(value);
        setUrl('');
        setPreview(null);
        setError(null);
    }, []);
    const handleUrlChange = useCallback((e) => {
        const value = e.target.value;
        setUrl(value);
        setError(null);
        setPreview(value.trim() || null);
    }, []);
    const handleFileSelect = useCallback(async () => {
        const input = fileInputRef.current;
        if (!input)
            return;
        input.click();
    }, []);
    const handleFileChange = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        try {
            const dataUri = await fileToDataUri(file);
            setUrl(dataUri);
            setPreview(dataUri);
            setError(null);
            if (!alt) {
                setAlt(file.name.replace(/\.[^.]+$/, ''));
            }
        }
        catch {
            setError('Failed to read the selected file.');
        }
        // Reset file input so the same file can be re-selected
        e.target.value = '';
    }, [alt]);
    const handleInsert = useCallback(() => {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
            setError('Please provide an image URL or upload a file.');
            return;
        }
        onInsert({ src: trimmedUrl, alt: alt.trim(), title: title.trim() });
        reset();
        onOpenChange(false);
    }, [url, alt, title, onInsert, reset, onOpenChange]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleInsert();
        }
    }, [handleInsert]);
    const canInsert = url.trim().length > 0;
    return (_jsx(Dialog, { open: open, onOpenChange: handleOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-md", onKeyDown: handleKeyDown, children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(ImagePlus, { className: "h-5 w-5" }), t('insertImageDialog.title')] }), _jsx(DialogDescription, { children: t('insertImageDialog.description') })] }), _jsxs("div", { className: "grid gap-4 py-2", children: [_jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { htmlFor: "image-source", children: t('insertImageDialog.source') }), _jsxs(Select, { value: source, onValueChange: handleSourceChange, children: [_jsx(SelectTrigger, { id: "image-source", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "url", children: t('insertImageDialog.url') }), _jsx(SelectItem, { value: "upload", children: t('insertImageDialog.uploadFromComputer') })] })] })] }), source === 'url' ? (_jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { htmlFor: "image-url", children: t('insertImageDialog.imageUrl') }), _jsx(Input, { id: "image-url", placeholder: "https://example.com/image.png", value: url, onChange: handleUrlChange, autoFocus: true })] })) : (_jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { children: t('insertImageDialog.file') }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif", className: "hidden", onChange: handleFileChange }), _jsxs(Button, { type: "button", variant: "outline", className: "justify-start gap-2", onClick: handleFileSelect, children: [_jsx(Upload, { className: "h-4 w-4" }), preview ? t('insertImageDialog.changeFile') : t('insertImageDialog.chooseFile')] })] })), _jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { htmlFor: "image-alt", children: t('insertImageDialog.altText') }), _jsx(Input, { id: "image-alt", placeholder: t('insertImageDialog.altTextPlaceholder'), value: alt, onChange: (e) => setAlt(e.target.value) })] }), _jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { htmlFor: "image-title", children: t('insertImageDialog.titleOptional') }), _jsx(Input, { id: "image-title", placeholder: t('insertImageDialog.titlePlaceholder'), value: title, onChange: (e) => setTitle(e.target.value) })] }), preview && (_jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { children: t('common.preview') }), _jsx("div", { className: "overflow-hidden rounded-md border border-border bg-muted/50 p-2", children: _jsx("img", { src: preview, alt: alt || 'Preview', className: "mx-auto block rounded", style: { maxHeight: MAX_PREVIEW_HEIGHT, maxWidth: '100%', objectFit: 'contain' }, onError: () => setError(t('insertImageDialog.previewError')) }) })] })), error && _jsx("p", { className: "text-sm text-destructive", children: error })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => handleOpenChange(false), children: t('common.cancel') }), _jsx(Button, { onClick: handleInsert, disabled: !canInsert, children: t('insertImageDialog.insert') })] })] }) }));
}
