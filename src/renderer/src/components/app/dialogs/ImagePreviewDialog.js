import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/Dialog';
export function ImagePreviewDialog({ open, onOpenChange, src, alt, }) {
    const { t } = useTranslation();
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogPortal, { children: [_jsx(DialogOverlay, {}), _jsxs(DialogPrimitive.Popup, { "aria-describedby": undefined, className: cn('fixed inset-0 z-[9999] flex items-center justify-center p-8', 'data-open:animate-in data-closed:animate-out', 'data-closed:fade-out-0 data-open:fade-in-0'), onClick: () => onOpenChange(false), children: [_jsxs("button", { type: "button", onPointerDown: (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onOpenChange(false);
                            }, className: cn('absolute right-4 top-4 z-10 rounded-full p-2', 'bg-black/50 text-white backdrop-blur-sm', 'transition-opacity hover:bg-black/70', 'focus:outline-none focus:ring-2 focus:ring-white/50'), children: [_jsx(X, { className: "h-5 w-5" }), _jsx("span", { className: "sr-only", children: t('imageNode.cancel') })] }), src && (_jsx("img", { src: src, alt: alt ?? '', onClick: (e) => e.stopPropagation(), className: "max-h-full max-w-full rounded-lg object-contain shadow-2xl" })), _jsx(DialogPrimitive.Title, { className: "sr-only", children: alt ?? t('imageNode.imagePreview', 'Image preview') })] })] }) }));
}
