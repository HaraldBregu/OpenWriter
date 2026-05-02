import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { PDFViewer } from '@embedpdf/react-pdf-viewer';
import { ChevronDown, FileText, Info, Play } from 'lucide-react';
import { getProvider } from '../../../../../../shared/providers';
const OCR_MODELS = [];
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/DropdownMenu';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { MIME_TYPE_PDF } from '../../shared/resource-preview-utils';
import { useContext } from '../hooks/use-context';
import { formatFileSize, getFileExtension, getFileNameWithoutExtension, } from '../shared/file-utils';
const PROVIDER_COLORS = {
    openai: 'bg-green-600',
    anthropic: 'bg-amber-700',
};
function ProviderIcon({ providerId }) {
    const bg = PROVIDER_COLORS[providerId] ?? 'bg-zinc-500';
    const name = getProvider(providerId)?.name ?? providerId;
    return (_jsx("span", { className: `inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold leading-none text-white ${bg}`, children: name.charAt(0) }));
}
const EXTRA_OPTIONS = [
    { value: 'immagine', label: 'Immagine' },
    { value: 'intestazione', label: 'Intestazione' },
    { value: 'per-pagina', label: 'Per di pagina' },
];
function SectionHeader({ label, hasInfo = false, onAdd, }) {
    return (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-xs font-medium text-muted-foreground", children: label }), hasInfo && _jsx(Info, { className: "h-3 w-3 text-muted-foreground/50" })] }), onAdd && (_jsx(Button, { variant: "ghost", size: "xs", onClick: onAdd, children: "Aggiungi" }))] }));
}
export function PdfDialog() {
    const { activeFile, fileDetailsOpen, handleFileDetailsOpenChange } = useContext();
    const [selectedModel, setSelectedModel] = useState(OCR_MODELS[0]?.modelId ?? '');
    const handleModelChange = (modelId) => {
        setSelectedModel(modelId);
    };
    const selectedModelEntry = OCR_MODELS.find((m) => m.modelId === selectedModel);
    const [selectedExtras, setSelectedExtras] = useState(['intestazione']);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [outputFileName, setOutputFileName] = useState(activeFile ? getFileNameWithoutExtension(activeFile.name) : '');
    useEffect(() => {
        if (activeFile?.name) {
            setOutputFileName(getFileNameWithoutExtension(activeFile.name));
        }
    }, [activeFile?.name]);
    useEffect(() => {
        if (!activeFile?.path || activeFile.mimeType !== MIME_TYPE_PDF) {
            setPdfBlobUrl(null);
            return;
        }
        let objectUrl = null;
        let cancelled = false;
        window.workspace.readFileBinary(activeFile.path).then((base64) => {
            if (cancelled)
                return;
            const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
            const blob = new Blob([bytes], { type: 'application/pdf' });
            objectUrl = URL.createObjectURL(blob);
            setPdfBlobUrl(objectUrl);
        });
        return () => {
            cancelled = true;
            if (objectUrl)
                URL.revokeObjectURL(objectUrl);
        };
    }, [activeFile?.path, activeFile?.mimeType]);
    const toggleExtra = (value) => {
        setSelectedExtras((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
    };
    if (!activeFile || activeFile.mimeType !== MIME_TYPE_PDF) {
        return null;
    }
    return (_jsx(Dialog, { open: fileDetailsOpen, onOpenChange: handleFileDetailsOpenChange, children: _jsx(DialogContent, { className: "flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col py-0 p-0", children: _jsx(DialogHeader, { className: "contents space-y-0 text-left py-0", children: _jsx(DialogDescription, { render: _jsx("div", {}), className: "flex min-h-0 flex-1", children: _jsxs(ResizablePanelGroup, { orientation: "horizontal", className: "h-full w-full", children: [_jsx(ResizablePanel, { defaultSize: 70, minSize: "40%", className: "rounded-l-xl", children: pdfBlobUrl && (_jsx(PDFViewer, { className: "h-full w-full", config: {
                                        src: pdfBlobUrl,
                                        disabledCategories: [
                                            'annotation',
                                            'annotation-highlight',
                                            'annotation-markup',
                                            'print',
                                            'redaction',
                                            'zoom',
                                            'document-print',
                                            'export',
                                            'document-export',
                                            'annotation',
                                            'redaction',
                                            'tools',
                                            'selection',
                                            'history',
                                        ],
                                        theme: {
                                            preference: 'system',
                                        },
                                    } })) }), _jsx(ResizableHandle, { withHandle: true }), _jsx(ResizablePanel, { defaultSize: 30, minSize: "30%", children: _jsxs("div", { className: "flex h-full flex-col", children: [_jsx("div", { className: "border-b p-4", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted", children: _jsx(FileText, { className: "h-5 w-5 text-muted-foreground" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-semibold", children: activeFile.name }), _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground", children: [_jsx("span", { children: getFileExtension(activeFile.name) }), _jsx("span", { children: formatFileSize(activeFile.size) }), _jsx("span", { children: new Date(activeFile.modifiedAt).toLocaleDateString() })] })] })] }) }), _jsx("div", { className: "p-4", children: _jsx("h2", { className: "text-sm font-semibold", children: "Impostazioni OCR" }) }), _jsx(ScrollArea, { className: "flex-1", children: _jsxs("div", { className: "divide-y divide-border", children: [_jsxs("div", { className: "flex items-center justify-between gap-4 p-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium", children: "Modello" }), _jsx("p", { className: "text-[11px] text-muted-foreground", children: selectedModelEntry
                                                                            ? (getProvider(selectedModelEntry.providerId)?.name ??
                                                                                selectedModelEntry.providerId)
                                                                            : 'AI' })] }), _jsxs(DropdownMenu, { children: [_jsxs(DropdownMenuTrigger, { render: _jsx(Button, { variant: "outline" }), className: "h-8 min-w-40 shrink-0 gap-2 text-xs font-normal", children: [selectedModelEntry && (_jsx(ProviderIcon, { providerId: selectedModelEntry.providerId })), _jsx("span", { className: "truncate", children: selectedModelEntry?.name ?? 'Seleziona modello' }), _jsx(ChevronDown, { className: "ml-1 h-3.5 w-3.5 shrink-0 opacity-50" })] }), _jsx(DropdownMenuContent, { align: "start", className: "max-h-72 overflow-y-auto", children: _jsx(DropdownMenuRadioGroup, { value: selectedModel, onValueChange: handleModelChange, children: Array.from(new Set(OCR_MODELS.map((m) => m.providerId))).map((providerId, idx) => (_jsxs("div", { children: [idx > 0 && _jsx(DropdownMenuSeparator, {}), OCR_MODELS.filter((m) => m.providerId === providerId).map((model) => (_jsxs(DropdownMenuRadioItem, { value: model.modelId, className: "gap-2", children: [_jsx(ProviderIcon, { providerId: model.providerId }), model.name] }, model.modelId)))] }, providerId))) }) })] })] }), _jsxs("div", { className: "space-y-2 p-4", children: [_jsx(SectionHeader, { label: "Formato della risposta", hasInfo: true, onAdd: () => { } }), _jsx("p", { className: "text-xs text-muted-foreground", children: "All 0s: 1 2 3" })] }), _jsxs("div", { className: "space-y-2 p-4", children: [_jsx(SectionHeader, { label: "Extra tabelle" }), _jsx("p", { className: "text-xs", children: "Markdown autonomo" })] }), _jsxs("div", { className: "space-y-2 p-4", children: [_jsx(SectionHeader, { label: "Extra", onAdd: () => { } }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: EXTRA_OPTIONS.map((option) => (_jsx(Button, { variant: selectedExtras.includes(option.value)
                                                                        ? 'outline-selected'
                                                                        : 'outline', size: "xs", onClick: () => toggleExtra(option.value), children: option.label }, option.value))) })] }), _jsxs("div", { className: "flex items-center justify-between p-4", children: [_jsx("span", { className: "text-xs font-medium text-muted-foreground", children: "Aggiungi immagine" }), _jsx(Button, { variant: "ghost", size: "xs", children: "Aggiungi" })] }), _jsxs("div", { className: "space-y-2 p-4", children: [_jsx(SectionHeader, { label: "Punteggio di confidenza" }), _jsx(Badge, { variant: "outline", children: "Nessuno" })] }), _jsx("div", { className: "p-4", children: _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Funzionalit\u00E0 aggiuntive disponibili tramite", ' ', _jsx("span", { className: "font-medium text-primary", children: "OWR Document AI" })] }) })] }) }), _jsxs("div", { className: "space-y-1.5 border-t px-4 pt-3 pb-2", children: [_jsx("label", { className: "text-xs font-medium text-muted-foreground", children: "Nome file di output" }), _jsx(Input, { value: outputFileName, onChange: (e) => setOutputFileName(e.target.value), placeholder: "Nome file di output", className: "h-8 text-xs" })] }), _jsxs("div", { className: "flex gap-2 border-t p-4", children: [_jsx(Button, { variant: "outline", className: "flex-1", onClick: () => handleFileDetailsOpenChange(false), children: "Annulla" }), _jsxs(Button, { className: "flex-1 gap-1.5", onClick: async () => {
                                                        if (activeFile?.path && selectedModel) {
                                                            const result = await window.task.submit({
                                                                type: 'ocr',
                                                                input: {
                                                                    url: activeFile.path,
                                                                    modelId: selectedModel,
                                                                    inputType: 'url',
                                                                },
                                                                metadata: {},
                                                            });
                                                            if (!result.success) {
                                                                console.error('[PdfDialog] OCR submit failed:', result.error.message);
                                                            }
                                                        }
                                                    }, children: [_jsx(Play, { className: "h-3.5 w-3.5" }), "Esegui OCR"] })] })] }) })] }) }) }) }) }));
}
