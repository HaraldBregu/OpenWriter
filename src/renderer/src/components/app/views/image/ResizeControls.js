import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
const MIN_DIMENSION = 1;
const MAX_DIMENSION = 8000;
export function ResizeControls({ currentWidth, currentHeight, onApply, }) {
    const { t } = useTranslation();
    const [widthInput, setWidthInput] = useState(String(currentWidth));
    const [heightInput, setHeightInput] = useState(String(currentHeight));
    const [isLocked, setIsLocked] = useState(true);
    const aspectRatioRef = useRef(currentWidth / currentHeight);
    useEffect(() => {
        setWidthInput(String(currentWidth));
        setHeightInput(String(currentHeight));
        if (currentHeight > 0) {
            aspectRatioRef.current = currentWidth / currentHeight;
        }
    }, [currentWidth, currentHeight]);
    const clampDimension = useCallback((value) => Math.round(Math.min(Math.max(value, MIN_DIMENSION), MAX_DIMENSION)), []);
    const handleWidthChange = useCallback((e) => {
        const raw = e.target.value;
        setWidthInput(raw);
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && isLocked) {
            const newHeight = clampDimension(parsed / aspectRatioRef.current);
            setHeightInput(String(newHeight));
        }
    }, [clampDimension, isLocked]);
    const handleHeightChange = useCallback((e) => {
        const raw = e.target.value;
        setHeightInput(raw);
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && isLocked) {
            const newWidth = clampDimension(parsed * aspectRatioRef.current);
            setWidthInput(String(newWidth));
        }
    }, [clampDimension, isLocked]);
    const handleApply = useCallback(() => {
        const w = clampDimension(parseInt(widthInput, 10) || currentWidth);
        const h = clampDimension(parseInt(heightInput, 10) || currentHeight);
        onApply(w, h);
    }, [clampDimension, currentHeight, currentWidth, heightInput, onApply, widthInput]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter')
            handleApply();
    }, [handleApply]);
    const toggleLock = useCallback(() => {
        if (!isLocked && currentHeight > 0) {
            aspectRatioRef.current = currentWidth / currentHeight;
        }
        setIsLocked((prev) => !prev);
    }, [currentHeight, currentWidth, isLocked]);
    return (_jsxs("div", { className: "flex flex-wrap items-end gap-2", children: [_jsx("span", { id: "resize-dimensions-hint", className: "sr-only", children: t('imageNode.resizeDimensionsHint', {
                    min: MIN_DIMENSION,
                    max: MAX_DIMENSION,
                    defaultValue: `Enter a value between ${MIN_DIMENSION} and ${MAX_DIMENSION}`,
                }) }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-xs text-muted-foreground", htmlFor: "resize-width", children: t('imageNode.width') }), _jsx("input", { id: "resize-width", type: "number", min: MIN_DIMENSION, max: MAX_DIMENSION, value: widthInput, onChange: handleWidthChange, onKeyDown: handleKeyDown, "aria-describedby": "resize-dimensions-hint", className: "h-7 w-20 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { render: _jsx(Button, { variant: "ghost", size: "icon-xs", "aria-label": isLocked ? t('imageNode.unlockAspectRatio') : t('imageNode.lockAspectRatio'), "aria-pressed": isLocked, onClick: toggleLock, className: "mb-0.5", children: isLocked ? _jsx(Lock, {}) : _jsx(Unlock, {}) }) }), _jsx(TooltipContent, { side: "top", className: "px-2 py-1 text-xs", children: isLocked ? t('imageNode.unlockAspectRatio') : t('imageNode.lockAspectRatio') })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-xs text-muted-foreground", htmlFor: "resize-height", children: t('imageNode.height') }), _jsx("input", { id: "resize-height", type: "number", min: MIN_DIMENSION, max: MAX_DIMENSION, value: heightInput, onChange: handleHeightChange, onKeyDown: handleKeyDown, "aria-describedby": "resize-dimensions-hint", className: "h-7 w-20 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" })] }), _jsx(Button, { size: "sm", onClick: handleApply, "aria-label": t('imageNode.applyResize', 'Apply resize'), className: "mb-0.5 h-7 rounded-full px-2 text-xs", children: t('imageNode.resize') })] }));
}
