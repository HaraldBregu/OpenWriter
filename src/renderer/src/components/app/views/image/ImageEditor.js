import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, RotateCw, Crop as CropIcon, RefreshCcw, Undo2, Check, X, Sparkles, ImageOff, ArrowUp, LoaderCircle, ImagePlus, ChevronDown, Scaling, } from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { ToolbarButton } from './ToolbarButton';
import { ResizeControls } from './ResizeControls';
import { Textarea } from '@/components/ui/Textarea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, } from '@/components/ui/DropdownMenu';
import { useImageCanvas } from './hooks';
import { getProvider } from '@shared/index';
const IMAGE_MODELS = [
    {
        providerId: 'openai',
        modelId: 'gpt-image-1',
        name: 'GPT Image 1',
        type: 'image',
        contextWindow: null,
        maxOutputTokens: null,
    },
];
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';
const AI_PROCESSING_DELAY_MS = 300;
const TOOLTIP_DELAY_MS = 300;
const MIN_CROP_SIZE = 4;
function readFileAsDataUri(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`FileReader failed for ${file.name}`));
        reader.readAsDataURL(file);
    });
}
export function ImageEditor({ src, alt, initialMode, onSave, onCancel, }) {
    const { t } = useTranslation();
    const [activeMode, setActiveMode] = useState(initialMode ?? null);
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [aiPrompt, setAIPrompt] = useState('');
    const [aiFiles, setAIFiles] = useState([]);
    const [aiPreviewUrls, setAIPreviewUrls] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedModelId, setSelectedModelId] = useState(IMAGE_MODELS[0]?.modelId ?? '');
    const editorRef = useRef(null);
    const aiTextareaRef = useRef(null);
    const aiFileInputRef = useRef(null);
    const { canvasRef, state, applyRotation, applyCrop, resetCrop, setCropRegion, applyResize, applyAI, undo, canUndo, exportDataUri, } = useImageCanvas(src);
    const [crop, setCrop] = useState();
    const handleCropChange = useCallback((pixelCrop) => {
        setCrop(pixelCrop);
        const canvas = canvasRef.current;
        if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0)
            return;
        const scaleX = canvas.width / canvas.clientWidth;
        const scaleY = canvas.height / canvas.clientHeight;
        setCropRegion({
            x: Math.round(pixelCrop.x * scaleX),
            y: Math.round(pixelCrop.y * scaleY),
            width: Math.round(pixelCrop.width * scaleX),
            height: Math.round(pixelCrop.height * scaleY),
        });
    }, [canvasRef, setCropRegion]);
    const addAIFile = useCallback((newFile) => {
        setAIFiles((prev) => [...prev, newFile]);
        readFileAsDataUri(newFile)
            .then((result) => {
            setAIPreviewUrls((prev) => [...prev, result]);
        })
            .catch(() => { });
    }, []);
    const removeAIFile = useCallback((index) => {
        setAIFiles((prev) => prev.filter((_, i) => i !== index));
        setAIPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    }, []);
    const handleAIFileInputChange = useCallback((e) => {
        const selected = e.target.files;
        if (!selected)
            return;
        for (const file of Array.from(selected)) {
            if (file.type.startsWith('image/')) {
                addAIFile(file);
            }
        }
        e.target.value = '';
    }, [addAIFile]);
    const handleAIDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);
    const handleAIDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);
    const handleAIDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
        for (const file of Array.from(e.dataTransfer.files)) {
            if (file.type.startsWith('image/')) {
                addAIFile(file);
            }
        }
    }, [addAIFile]);
    const handleApplyCrop = useCallback(() => {
        applyCrop();
        setCrop(undefined);
    }, [applyCrop]);
    const handleResetCrop = useCallback(() => {
        resetCrop();
        setCrop(undefined);
    }, [resetCrop]);
    const handleSave = useCallback(() => {
        const dataUri = exportDataUri();
        if (dataUri) {
            onSave(dataUri);
        }
    }, [exportDataUri, onSave]);
    const handleModeChange = useCallback((mode) => {
        setActiveMode((prevMode) => {
            const nextMode = prevMode === mode ? null : mode;
            if (prevMode === 'crop' && nextMode !== 'crop') {
                resetCrop();
                setCrop(undefined);
            }
            return nextMode;
        });
    }, [resetCrop]);
    useEffect(() => {
        if (activeMode === 'ai') {
            aiTextareaRef.current?.focus();
        }
        if (activeMode === 'resize') {
            const widthInput = editorRef.current?.querySelector('#resize-width');
            widthInput?.focus();
        }
    }, [activeMode]);
    const handleAISubmit = useCallback(() => {
        if (!aiPrompt.trim())
            return;
        setIsProcessingAI(true);
        setTimeout(() => {
            applyAI(aiPrompt.trim());
            setAIPrompt('');
            setActiveMode(null);
            setIsProcessingAI(false);
        }, AI_PROCESSING_DELAY_MS);
    }, [aiPrompt, applyAI]);
    const handleAIButtonClick = useCallback(() => {
        if (isProcessingAI)
            return;
        handleModeChange('ai');
    }, [isProcessingAI, handleModeChange]);
    const handleCancelAI = useCallback(() => {
        if (isProcessingAI)
            return;
        setAIPrompt('');
        setAIFiles([]);
        setAIPreviewUrls([]);
        setActiveMode(null);
    }, [isProcessingAI]);
    const handlePromptKeyDown = useCallback((e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleAISubmit();
        }
        if (e.key === 'Escape') {
            handleCancelAI();
        }
    }, [handleAISubmit, handleCancelAI]);
    const handleEditorKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onCancel();
        }
    }, [onCancel]);
    const currentWidth = state.dimensions?.width ?? 0;
    const currentHeight = state.dimensions?.height ?? 0;
    const cropWidth = state.cropRegion?.width ?? 0;
    const cropHeight = state.cropRegion?.height ?? 0;
    const hasCropSelection = state.cropRegion !== null && cropWidth >= MIN_CROP_SIZE && cropHeight >= MIN_CROP_SIZE;
    const cropDimensionLabel = hasCropSelection
        ? `${Math.round(cropWidth)} x ${Math.round(cropHeight)} px`
        : `${currentWidth} x ${currentHeight} px`;
    return (_jsxs("div", { ref: editorRef, className: "overflow-hidden border border-border bg-card/90", role: "dialog", "aria-modal": "true", "aria-label": t('imageNode.editorLabel', 'Image editor'), onKeyDown: handleEditorKeyDown, children: [_jsx(TooltipProvider, { delay: TOOLTIP_DELAY_MS, children: _jsxs("div", { className: "border-b border-border", children: [_jsxs("div", { className: "flex items-center gap-1 px-3 py-2.5", children: [_jsxs("div", { className: "flex items-center gap-0.5", role: "toolbar", "aria-label": t('imageNode.editTools', 'Edit tools'), children: [_jsx(ToolbarButton, { icon: _jsx(CropIcon, {}), label: t('imageNode.crop'), onClick: () => handleModeChange('crop'), active: activeMode === 'crop' }), _jsx(ToolbarButton, { icon: _jsx(RefreshCcw, {}), label: t('imageNode.rotate'), onClick: () => handleModeChange('rotate'), active: activeMode === 'rotate' }), _jsx(ToolbarButton, { icon: _jsx(Scaling, {}), label: t('imageNode.resize'), onClick: () => handleModeChange('resize'), active: activeMode === 'resize' }), _jsx(ToolbarButton, { icon: _jsx(Sparkles, {}), label: "AI Transform", onClick: handleAIButtonClick, active: activeMode === 'ai', disabled: !state.isLoaded || isProcessingAI })] }), _jsx("div", { className: "mx-1 h-4 w-px bg-border/60", "aria-hidden": "true" }), _jsx(ToolbarButton, { icon: _jsx(Undo2, {}), label: "Undo", onClick: undo, disabled: !canUndo }), _jsx("div", { className: "flex-1" }), _jsxs("div", { className: "flex items-center gap-0.5", role: "group", "aria-label": t('imageNode.saveOrCancel', 'Save or cancel'), children: [_jsx(Button, { variant: "ghost", size: "icon-xs", "aria-label": t('imageNode.cancel'), onClick: onCancel, className: "h-8 w-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive [&_svg]:h-4 [&_svg]:w-4", children: _jsx(X, {}) }), _jsx(Button, { variant: "ghost", size: "icon-xs", "aria-label": t('imageNode.save'), onClick: handleSave, disabled: !state.isLoaded, className: "h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary [&_svg]:h-4 [&_svg]:w-4", children: _jsx(Check, {}) })] })] }), (activeMode === 'crop' || activeMode === 'rotate' || activeMode === 'resize') && (_jsxs("div", { className: "border-t border-border/60 bg-muted/30 px-2 py-1.5", children: [activeMode === 'crop' && (_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Button, { size: "sm", onClick: handleApplyCrop, disabled: !hasCropSelection, className: "h-7 rounded-full px-2 text-xs", children: t('imageNode.applyCrop') }), _jsx(Button, { variant: "outline", size: "sm", onClick: handleResetCrop, disabled: !state.cropRegion, className: "h-7 rounded-full px-2 text-xs", children: t('imageNode.resetCrop') }), _jsx("span", { className: "ml-1 text-xs tabular-nums text-muted-foreground", "aria-live": "polite", "aria-atomic": "true", children: cropDimensionLabel })] })), activeMode === 'rotate' && (_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(ToolbarButton, { icon: _jsx(RotateCcw, {}), label: t('imageNode.rotateLeft'), onClick: () => applyRotation('left'), disabled: !state.isLoaded }), _jsx(ToolbarButton, { icon: _jsx(RotateCw, {}), label: t('imageNode.rotateRight'), onClick: () => applyRotation('right'), disabled: !state.isLoaded }), _jsxs("span", { className: "ml-1 text-xs tabular-nums text-muted-foreground", "aria-live": "polite", "aria-atomic": "true", children: [state.rotation, "\u00B0"] })] })), activeMode === 'resize' && (_jsx(ResizeControls, { currentWidth: currentWidth, currentHeight: currentHeight, onApply: applyResize }))] }))] }) }), activeMode === 'ai' && (_jsxs("div", { className: cn('flex flex-col', isDragOver && 'ring-2 ring-inset ring-primary/40'), onDragOver: handleAIDragOver, onDragLeave: handleAIDragLeave, onDrop: handleAIDrop, children: [_jsx("input", { ref: aiFileInputRef, type: "file", accept: ACCEPTED_IMAGE_TYPES, className: "hidden", onChange: handleAIFileInputChange, "aria-hidden": "true", tabIndex: -1, multiple: true }), _jsx("div", { className: "border-b border-border/65 bg-muted/[0.28] px-3.5 pb-2 dark:border-white/10 dark:bg-white/[0.03]", children: _jsxs("div", { className: "flex items-center gap-2 overflow-x-auto pt-3 pb-1", children: [_jsx("div", { className: "relative h-16 w-16 shrink-0 overflow-hidden rounded-[1.15rem] border border-border/75 bg-background/82 shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_6px_16px_hsl(var(--foreground)/0.05)] dark:border-white/12 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_8px_18px_hsl(var(--background)/0.32)]", children: _jsx("img", { src: src, alt: alt ?? '', className: "h-full w-full object-contain" }) }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-16 shrink-0 rounded-[1.15rem] border border-dashed border-border/80 bg-background/76 px-3 text-xs font-medium text-muted-foreground shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_10px_hsl(var(--foreground)/0.04)] hover:border-foreground/18 hover:bg-background hover:text-foreground dark:border-white/14 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.26)] dark:hover:border-white/18 dark:hover:bg-white/[0.05]", disabled: isProcessingAI, onMouseDown: (e) => {
                                        e.preventDefault();
                                        aiFileInputRef.current?.click();
                                    }, children: _jsxs("div", { className: "flex flex-col items-center gap-1", children: [_jsx(ImagePlus, { className: "h-4 w-4" }), _jsx("span", { children: t('imageNode.addImage', 'Add image') })] }) }), aiPreviewUrls.map((url, index) => (_jsxs("div", { className: "group/thumb relative h-16 w-16 shrink-0", children: [_jsx("div", { className: "h-full w-full overflow-hidden rounded-[1.15rem] border border-border/75 bg-background/82 shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_6px_16px_hsl(var(--foreground)/0.05)] dark:border-white/12 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_8px_18px_hsl(var(--background)/0.32)]", children: _jsx("img", { src: url, alt: aiFiles[index]?.name ?? '', className: "h-full w-full object-contain" }) }), _jsx(Button, { variant: "ghost", size: "icon-xs", className: "absolute -right-1.5 -top-1.5 z-10 h-5 w-5 rounded-full border border-border/70 bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover/thumb:opacity-100 hover:bg-background hover:text-foreground dark:border-white/12 dark:bg-background", onMouseDown: (e) => {
                                                e.preventDefault();
                                                removeAIFile(index);
                                            }, "aria-label": t('imageNode.removeImage', 'Remove image'), children: _jsx(X, { className: "h-3 w-3" }) })] }, `${aiFiles[index]?.name ?? 'ref'}-${index}`)))] }) }), _jsx(Textarea, { ref: aiTextareaRef, id: "ai-prompt", value: aiPrompt, onChange: (e) => setAIPrompt(e.target.value), onKeyDown: handlePromptKeyDown, placeholder: t('imageNode.aiPromptPlaceholder', 'Describe the image you want to create. You can also drop reference images here.'), "aria-label": t('imageNode.aiPromptLabel', 'AI transform prompt'), className: cn('min-h-[92px] w-full resize-none border-none bg-transparent px-4 pt-4 pb-3 text-sm leading-6 text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0', 'placeholder:text-foreground/42 dark:placeholder:text-muted-foreground/70', 'disabled:cursor-not-allowed disabled:opacity-60'), disabled: isProcessingAI, rows: 1 }), _jsxs("div", { className: "flex items-center justify-between gap-3 border-t border-border/65 bg-[linear-gradient(180deg,hsl(var(--muted)/0.22)_0%,hsl(var(--background)/0.22)_100%)] px-3.5 py-2.5 dark:border-white/10 dark:bg-[linear-gradient(180deg,hsl(var(--muted)/0.12)_0%,hsl(var(--background)/0.16)_100%)]", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { render: _jsxs(Button, { variant: "ghost", size: "sm", disabled: isProcessingAI, className: "h-7 gap-1 rounded-full px-2 text-[11px] font-medium text-foreground/65 hover:text-foreground dark:text-muted-foreground/95 dark:hover:text-foreground", children: [_jsx("span", { className: "truncate", children: IMAGE_MODELS.find((m) => m.modelId === selectedModelId)?.name ??
                                                                selectedModelId }), _jsx(ChevronDown, { className: "h-3 w-3 shrink-0 opacity-50" })] }) }), _jsx(DropdownMenuContent, { align: "start", side: "top", className: "min-w-[180px]", children: IMAGE_MODELS.map((model) => (_jsx(DropdownMenuItem, { onSelect: () => setSelectedModelId(model.modelId), className: cn(selectedModelId === model.modelId && 'bg-accent text-accent-foreground'), children: _jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("span", { className: "text-xs font-medium", children: model.name }), _jsx("span", { className: "text-[10px] text-muted-foreground", children: getProvider(model.providerId)?.name ?? model.providerId })] }) }, model.modelId))) })] }), isProcessingAI && (_jsx("span", { className: "truncate text-[11px] font-medium text-foreground/65 dark:text-muted-foreground/95", children: t('imageNode.aiProcessing', 'Processing...') }))] }), _jsx(Button, { variant: "default", size: "icon", className: "h-7 w-7 shrink-0 rounded-full shadow-[0_6px_14px_hsl(var(--primary)/0.16)] dark:shadow-[0_8px_16px_hsl(var(--primary)/0.18)]", disabled: !aiPrompt.trim() || isProcessingAI, onMouseDown: (e) => {
                                    e.preventDefault();
                                    if (!isProcessingAI)
                                        handleAISubmit();
                                }, "aria-label": t('imageNode.aiApply', 'Apply AI transform'), children: isProcessingAI ? _jsx(LoaderCircle, { className: "animate-spin" }) : _jsx(ArrowUp, {}) })] })] })), _jsxs("div", { className: cn('relative flex items-center justify-center', activeMode === 'ai' && 'hidden'), children: [state.hasError && (_jsxs("div", { className: cn('flex h-32 w-64 flex-col items-center justify-center gap-2', 'border border-dashed border-destructive/40 bg-destructive/5', 'text-destructive/70'), role: "alert", "aria-live": "assertive", children: [_jsx(ImageOff, { className: "h-6 w-6 opacity-50", "aria-hidden": "true" }), _jsx("span", { className: "text-xs", children: alt ?? t('imageNode.notFound') })] })), !state.hasError && (_jsx("div", { className: "relative inline-block max-w-full", children: _jsx(ReactCrop, { crop: activeMode === 'crop' ? crop : undefined, onChange: handleCropChange, ruleOfThirds: activeMode === 'crop', minWidth: MIN_CROP_SIZE, minHeight: MIN_CROP_SIZE, disabled: activeMode !== 'crop', className: "max-w-full", children: _jsx("canvas", { ref: canvasRef, className: "block max-w-full", role: "img", "aria-label": alt ?? t('imageNode.canvasLabel', 'Image being edited') }) }) }))] })] }));
}
