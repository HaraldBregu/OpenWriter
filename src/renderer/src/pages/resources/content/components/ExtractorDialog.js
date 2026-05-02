import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ChevronDown, FileText, ImageIcon, Info, Play } from 'lucide-react';
import { getProvider } from '../../../../../../shared/providers';
const OCR_MODELS = [];
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from '@/components/ui/Card';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/DropdownMenu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, } from '@/components/ui/Empty';
import { FileUpload, FileUploadDropzone, FileUploadTrigger } from '@/components/ui/FileUpload';
import { Image } from '@/components/app/image/Image';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/Item';
import { Pdf } from '@/components/app/pdf/Pdf';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable';
import { ScrollArea } from '@/components/ui/ScrollArea';
const ACCEPT_ALL = 'image/*,application/pdf';
const GENERIC_CONFIG = {
    title: 'Impostazioni estrazione',
    description: "Carica un'immagine o un PDF per configurare l'estrazione.",
    submitLabel: 'Esegui',
    emptyTitle: 'Carica un file',
    emptyDescription: "Trascina qui un'immagine (PNG, JPG, WEBP…) o un PDF, oppure",
    selectLabel: 'Scegli file',
    placeholder: 'File',
    changeLabel: 'Cambia file',
    icon: _jsx(FileText, { className: "h-5 w-5 text-muted-foreground" }),
    emptyIcon: (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(ImageIcon, { className: "size-8 text-muted-foreground" }), _jsx(FileText, { className: "size-8 text-muted-foreground" })] })),
};
const detectType = (file) => file.type === 'application/pdf' ? 'pdf' : 'image';
const EXTRA_OPTIONS = [
    { value: 'descrizione', label: 'Descrizione' },
    { value: 'didascalia', label: 'Didascalia' },
    { value: 'metadati', label: 'Metadati' },
];
const PROVIDER_COLORS = {
    openai: 'bg-green-600',
    anthropic: 'bg-amber-700',
};
const TYPE_CONFIG = {
    image: {
        icon: _jsx(ImageIcon, { className: "h-5 w-5 text-muted-foreground" }),
        placeholder: 'Immagine',
        changeLabel: 'Cambia immagine',
        title: 'Impostazioni analisi',
        description: "Configura il modello AI per estrarre descrizione, didascalia e metadati dall'immagine.",
        submitLabel: 'Analizza',
    },
    pdf: {
        icon: _jsx(FileText, { className: "h-5 w-5 text-muted-foreground" }),
        placeholder: 'PDF',
        changeLabel: 'Cambia PDF',
        title: 'Impostazioni OCR',
        description: 'Configura il modello OCR per estrarre testo, tabelle e struttura dal PDF.',
        submitLabel: 'Esegui OCR',
    },
};
export function ExtractorDialog({ open, onOpenChange, onRun }) {
    const [selectedModel, setSelectedModel] = useState(OCR_MODELS[0]?.modelId ?? '');
    const [selectedExtras, setSelectedExtras] = useState(['descrizione']);
    const [outputFileName, setOutputFileName] = useState('');
    const [file, setFile] = useState(null);
    const [fileSrc, setFileSrc] = useState(null);
    const [fileName, setFileName] = useState(null);
    const [detectedType, setDetectedType] = useState(null);
    const typeConfig = detectedType ? TYPE_CONFIG[detectedType] : null;
    const config = {
        title: typeConfig?.title ?? GENERIC_CONFIG.title,
        description: typeConfig?.description ?? GENERIC_CONFIG.description,
        submitLabel: typeConfig?.submitLabel ?? GENERIC_CONFIG.submitLabel,
        icon: typeConfig?.icon ?? GENERIC_CONFIG.icon,
        placeholder: typeConfig?.placeholder ?? GENERIC_CONFIG.placeholder,
        changeLabel: typeConfig?.changeLabel ?? GENERIC_CONFIG.changeLabel,
        emptyTitle: GENERIC_CONFIG.emptyTitle,
        emptyDescription: GENERIC_CONFIG.emptyDescription,
        emptyIcon: GENERIC_CONFIG.emptyIcon,
        selectLabel: GENERIC_CONFIG.selectLabel,
    };
    const selectedModelEntry = OCR_MODELS.find((m) => m.modelId === selectedModel);
    const selectedProvider = selectedModelEntry
        ? getProvider(selectedModelEntry.providerId)
        : undefined;
    const selectedProviderBg = selectedModelEntry
        ? (PROVIDER_COLORS[selectedModelEntry.providerId] ?? 'bg-zinc-500')
        : 'bg-zinc-500';
    const selectedProviderName = selectedProvider?.name ?? selectedModelEntry?.providerId ?? '';
    const toggleExtra = (value) => {
        setSelectedExtras((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
    };
    const handleFileAccept = (next) => {
        const url = URL.createObjectURL(next);
        if (fileSrc)
            URL.revokeObjectURL(fileSrc);
        setFile(next);
        setFileSrc(url);
        setFileName(next.name);
        setDetectedType(detectType(next));
        setOutputFileName(next.name.replace(/\.[^.]+$/, ''));
    };
    const handleClose = (nextOpen) => {
        if (!nextOpen && fileSrc) {
            URL.revokeObjectURL(fileSrc);
            setFile(null);
            setFileSrc(null);
            setFileName(null);
            setDetectedType(null);
        }
        onOpenChange(nextOpen);
    };
    const handleRun = () => {
        if (!file || !fileSrc || !fileName || !detectedType || !selectedModel)
            return;
        const filePath = window.app.getPathForFile(file) || null;
        void onRun?.({
            type: detectedType,
            file,
            fileName,
            filePath,
            fileSrc,
            modelId: selectedModel,
            extras: selectedExtras,
            outputFileName: outputFileName || fileName.replace(/\.[^.]+$/, ''),
        });
    };
    return (_jsx(Dialog, { open: open, onOpenChange: handleClose, children: _jsx(DialogContent, { className: "flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col py-0 p-0", children: _jsxs(ResizablePanelGroup, { orientation: "horizontal", className: "h-full w-full", children: [_jsx(ResizablePanel, { defaultSize: 70, minSize: "40%", className: "relative rounded-l-xl", children: _jsx(FileUpload, { accept: ACCEPT_ALL, onFileAccept: handleFileAccept, className: "h-full w-full", children: _jsxs(FileUploadDropzone, { className: 'relative h-full w-full rounded-none border-0 bg-transparent p-0 hover:bg-muted/20', children: [!fileSrc && (_jsxs(Empty, { className: "border-0 p-0", children: [_jsxs(EmptyHeader, { children: [_jsx(EmptyMedia, { variant: "icon", className: "h-16 w-auto rounded-full px-4", children: config.emptyIcon }), _jsx(EmptyTitle, { children: config.emptyTitle }), _jsx(EmptyDescription, { children: config.emptyDescription })] }), _jsx(EmptyContent, { children: _jsx(FileUploadTrigger, { render: _jsx(Button, { variant: "outline", children: config.selectLabel }) }) })] })), fileSrc && detectedType === 'image' && (_jsx("div", { className: "flex h-full w-full items-center justify-center bg-muted/30 p-8", children: _jsx(Image, { src: fileSrc, alt: fileName ?? 'Preview', className: "max-h-full max-w-full object-contain", cardClassName: "max-h-full max-w-full overflow-hidden" }) })), fileSrc && detectedType === 'pdf' && (_jsx(Pdf, { src: fileSrc, className: "h-full w-full" }))] }) }) }), _jsx(ResizableHandle, { withHandle: true }), _jsx(ResizablePanel, { defaultSize: 30, minSize: "30%", children: _jsxs(Card, { className: "flex h-full flex-col gap-0 rounded-none border-0 ring-0", children: [_jsxs(CardHeader, { className: "gap-1 border-b", children: [_jsx(CardTitle, { className: "text-sm font-semibold", children: config.title }), _jsx(CardDescription, { className: "text-xs", children: config.description })] }), _jsxs(CardContent, { className: "flex min-h-0 flex-1 flex-col p-0", children: [_jsxs(Item, { children: [_jsx(ItemMedia, { variant: "icon", className: "h-10 w-10 rounded-lg bg-muted", children: config.icon }), _jsxs(ItemContent, { children: [_jsx(ItemTitle, { className: "truncate text-sm font-semibold", children: fileName ?? config.placeholder }), _jsx(ItemDescription, { className: "text-[11px]", children: fileName ? config.changeLabel : config.emptyDescription })] })] }), _jsx(ScrollArea, { className: "flex-1", children: _jsxs("div", { className: "divide-y divide-border", children: [_jsxs("div", { className: "flex items-center justify-between gap-4 p-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium", children: "Modello" }), _jsx("p", { className: "text-[11px] text-muted-foreground", children: selectedModelEntry ? selectedProviderName : 'AI' })] }), _jsxs(DropdownMenu, { children: [_jsxs(DropdownMenuTrigger, { render: _jsx(Button, { variant: "outline" }), className: "h-8 min-w-40 shrink-0 gap-2 text-xs font-normal", children: [selectedModelEntry && (_jsx("span", { className: `inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold leading-none text-white ${selectedProviderBg}`, children: selectedProviderName.charAt(0) })), _jsx("span", { className: "truncate", children: selectedModelEntry?.name ?? 'Seleziona modello' }), _jsx(ChevronDown, { className: "ml-1 h-3.5 w-3.5 shrink-0 opacity-50" })] }), _jsx(DropdownMenuContent, { align: "start", className: "max-h-72 overflow-y-auto", children: _jsx(DropdownMenuRadioGroup, { value: selectedModel, onValueChange: setSelectedModel, children: Array.from(new Set(OCR_MODELS.map((m) => m.providerId))).map((providerId, idx) => {
                                                                                const bg = PROVIDER_COLORS[providerId] ?? 'bg-zinc-500';
                                                                                const providerName = getProvider(providerId)?.name ?? providerId;
                                                                                return (_jsxs("div", { children: [idx > 0 && _jsx(DropdownMenuSeparator, {}), OCR_MODELS.filter((m) => m.providerId === providerId).map((model) => (_jsxs(DropdownMenuRadioItem, { value: model.modelId, className: "gap-2", children: [_jsx("span", { className: `inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold leading-none text-white ${bg}`, children: providerName.charAt(0) }), model.name] }, model.modelId)))] }, providerId));
                                                                            }) }) })] })] }), _jsxs("div", { className: "space-y-2 p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-xs font-medium text-muted-foreground", children: "Formato della risposta" }), _jsx(Info, { className: "h-3 w-3 text-muted-foreground/50" })] }), _jsx(Button, { variant: "ghost", size: "xs", onClick: () => { }, children: "Aggiungi" })] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "All 0s: 1 2 3" })] }), _jsxs("div", { className: "space-y-2 p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-medium text-muted-foreground", children: "Extra" }), _jsx(Button, { variant: "ghost", size: "xs", onClick: () => { }, children: "Aggiungi" })] }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: EXTRA_OPTIONS.map((option) => (_jsx(Button, { variant: selectedExtras.includes(option.value) ? 'outline-selected' : 'outline', size: "xs", onClick: () => toggleExtra(option.value), children: option.label }, option.value))) })] }), _jsxs("div", { className: "space-y-2 p-4", children: [_jsx("span", { className: "text-xs font-medium text-muted-foreground", children: "Punteggio di confidenza" }), _jsx(Badge, { variant: "outline", children: "Nessuno" })] }), _jsx("div", { className: "p-4", children: _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Funzionalit\u00E0 aggiuntive disponibili tramite", ' ', _jsx("span", { className: "font-medium text-primary", children: "OWR Document AI" })] }) })] }) })] }), _jsx(CardFooter, { className: "flex-col items-stretch gap-3 rounded-none bg-transparent p-4", children: _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", className: "flex-1", onClick: () => handleClose(false), children: "Annulla" }), _jsxs(Button, { className: "flex-1 gap-1.5", disabled: !fileSrc || !selectedModel, onClick: handleRun, children: [_jsx(Play, { className: "h-3.5 w-3.5" }), config.submitLabel] })] }) })] }) })] }) }) }));
}
