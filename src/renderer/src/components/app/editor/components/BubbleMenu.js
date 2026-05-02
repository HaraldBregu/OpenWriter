import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Bold, Code2, Copy, Italic, List, ListOrdered, Quote, Scissors, Sparkles, SpellCheck, Strikethrough, Trash2, Type, Underline, Wand2, } from 'lucide-react';
import { PluginKey } from '@tiptap/pm/state';
import { arrow, autoUpdate, flip, FloatingArrow, hide, offset, shift, useFloating, useTransitionStyles, } from '@floating-ui/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import { useEditor } from '../hooks';
import { BubbleMenuPlugin } from '../plugins/bubble-menu-plugin';
import { HeadingMenu } from './HeadingMenu';
import { InputMenu } from './InputMenu';
const pluginKey = new PluginKey('bubbleMenu');
const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl';
const shiftKey = isMac ? '⇧' : 'Shift';
const altKey = isMac ? '⌥' : 'Alt';
export const BubbleMenu = React.memo(function BubbleMenu({ onPromptSubmit, }) {
    const { editor } = useEditor();
    const referenceRectRef = useRef(null);
    const arrowRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [inputMenuOpen, setInputMenuOpen] = useState(false);
    const inputMenuOpenRef = useRef(false);
    const [, forceRender] = useReducer((x) => x + 1, 0);
    const virtualReference = useMemo(() => ({
        getBoundingClientRect: () => referenceRectRef.current?.() ?? new DOMRect(),
    }), []);
    const { refs, floatingStyles, context, middlewareData, update } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: 'left',
        strategy: 'fixed',
        whileElementsMounted: autoUpdate,
        middleware: [
            offset(8),
            flip({ fallbackPlacements: ['right'] }),
            shift({ padding: 8 }),
            arrow({ element: arrowRef }),
            hide({ strategy: 'referenceHidden' }),
        ],
    });
    useEffect(() => {
        const handler = () => {
            forceRender();
            const { from, to } = editor.state.selection;
            if (from !== to) {
                update();
            }
        };
        editor.on('transaction', handler);
        return () => {
            editor.off('transaction', handler);
        };
    }, [editor, update]);
    const referenceHiddenOffsets = middlewareData.hide?.referenceHiddenOffsets;
    const referenceHidden = (middlewareData.hide?.referenceHidden ?? false) ||
        (referenceHiddenOffsets
            ? referenceHiddenOffsets.top > 0 ||
                referenceHiddenOffsets.bottom > 0 ||
                referenceHiddenOffsets.left > 0 ||
                referenceHiddenOffsets.right > 0
            : false);
    useEffect(() => {
        refs.setPositionReference(virtualReference);
    }, [refs, virtualReference]);
    const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
        duration: { open: 220, close: 120 },
        initial: { opacity: 0, transform: 'scale(0.8)' },
        open: {
            opacity: 1,
            transform: 'scale(1)',
            transitionTimingFunction: 'cubic-bezier(0.16, 1.2, 0.4, 1)',
        },
        close: { opacity: 0, transform: 'scale(0.95)' },
        common: ({ side }) => ({
            transformOrigin: side === 'left' ? 'right center' : 'left center',
        }),
    });
    const handleAiAction = useCallback((prompt) => {
        const { from, to } = editor.state.selection;
        if (from === to)
            return;
        const slicedDoc = editor.state.doc.cut(from, to);
        const selectedText = editor.markdown?.serialize(slicedDoc.toJSON()) ??
            editor.state.doc.textBetween(from, to, '\n\n');
        onPromptSubmit?.({
            prompt,
            selectedText,
            files: [],
            editor,
        });
    }, [editor, onPromptSubmit]);
    const closeTimerRef = useRef(null);
    const isLockedRef = useRef(false);
    const handleCustomPromptClick = useCallback(() => {
        inputMenuOpenRef.current = true;
        setInputMenuOpen(true);
        setOpen(false);
    }, []);
    const handleInputMenuOpenChange = useCallback((nextOpen) => {
        inputMenuOpenRef.current = nextOpen;
        setInputMenuOpen(nextOpen);
    }, []);
    const handleInputMenuSubmit = useCallback((prompt) => {
        handleAiAction(prompt);
        inputMenuOpenRef.current = false;
        setInputMenuOpen(false);
    }, [handleAiAction]);
    const getSelectionRect = useCallback(() => referenceRectRef.current?.() ?? new DOMRect(), []);
    const handleCopy = useCallback(() => {
        const { from, to } = editor.state.selection;
        if (from === to)
            return;
        const text = editor.state.doc.textBetween(from, to, '\n\n');
        void navigator.clipboard.writeText(text);
    }, [editor]);
    const handleCut = useCallback(() => {
        const { from, to } = editor.state.selection;
        if (from === to)
            return;
        const text = editor.state.doc.textBetween(from, to, '\n\n');
        void navigator.clipboard.writeText(text);
        editor.chain().focus().deleteSelection().run();
    }, [editor]);
    const handleDelete = useCallback(() => {
        const { from, to } = editor.state.selection;
        if (from === to)
            return;
        editor.chain().focus().deleteSelection().run();
    }, [editor]);
    const handlePluginUpdate = useCallback(({ open: nextOpen, getReferenceRect, }) => {
        if (getReferenceRect) {
            referenceRectRef.current = getReferenceRect;
        }
        if (inputMenuOpenRef.current)
            return;
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        if (nextOpen) {
            setOpen(true);
            return;
        }
        if (isLockedRef.current)
            return;
        closeTimerRef.current = setTimeout(() => {
            closeTimerRef.current = null;
            if (refs.floating.current?.contains(document.activeElement))
                return;
            setOpen(false);
        }, 0);
    }, [refs]);
    useEffect(() => {
        return () => {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
        };
    }, []);
    useEffect(() => {
        const onDocMouseDown = (e) => {
            if (!isLockedRef.current)
                return;
            const target = e.target;
            if (target && refs.floating.current?.contains(target))
                return;
            if (target && target.closest?.('[data-input-menu-popover]'))
                return;
            isLockedRef.current = false;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDocMouseDown, true);
        return () => document.removeEventListener('mousedown', onDocMouseDown, true);
    }, [refs]);
    useEffect(() => {
        if (editor.isDestroyed)
            return;
        const plugin = BubbleMenuPlugin({
            pluginKey,
            editor,
            updateDelay: 250,
            onUpdate: handlePluginUpdate,
        });
        editor.registerPlugin(plugin);
        return () => {
            editor.unregisterPlugin(pluginKey);
        };
    }, [editor, handlePluginUpdate]);
    return (_jsxs(_Fragment, { children: [isMounted && (_jsx("div", { ref: refs.setFloating, role: "toolbar", "aria-label": "Selection toolbar", style: {
                    ...floatingStyles,
                    opacity: referenceHidden ? 0 : 1,
                    pointerEvents: referenceHidden ? 'none' : undefined,
                    transition: 'opacity 120ms ease-out',
                }, onMouseDown: (e) => {
                    if (e.target.closest('input, textarea'))
                        return;
                    e.preventDefault();
                }, className: "z-50", children: _jsxs("div", { style: transitionStyles, className: "relative will-change-transform", children: [_jsxs(Card, { size: "sm", className: cn('flex flex-col gap-1! py-2! px-2.5! w-47', 'shadow-[0_0_20px_0_rgba(0,0,0,0.12)]! dark:shadow-[0_0_24px_0_rgba(0,0,0,0.55)]!'), children: [_jsxs("div", { className: "flex flex-row items-center gap-0.5", children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { render: _jsx(Button, { variant: editor.isActive('bold') ? 'default' : 'ghost', size: "icon", "aria-label": "Bold", onClick: () => editor.chain().focus().toggleBold().run(), children: _jsx(Bold, { className: "h-3.5 w-3.5" }) }) }), _jsx(TooltipContent, { children: _jsxs("div", { className: "flex flex-col items-start gap-0.5", children: [_jsx("span", { children: "Bold" }), _jsx("span", { className: "text-[10px] opacity-70", children: `${modKey} B` })] }) })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { render: _jsx(Button, { variant: editor.isActive('italic') ? 'default' : 'ghost', size: "icon", "aria-label": "Italic", onClick: () => editor.chain().focus().toggleItalic().run(), children: _jsx(Italic, { className: "h-3.5 w-3.5" }) }) }), _jsx(TooltipContent, { children: _jsxs("div", { className: "flex flex-col items-start gap-0.5", children: [_jsx("span", { children: "Italic" }), _jsx("span", { className: "text-[10px] opacity-70", children: `${modKey} I` })] }) })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { render: _jsx(Button, { variant: editor.isActive('underline') ? 'default' : 'ghost', size: "icon", "aria-label": "Underline", onClick: () => editor.chain().focus().toggleUnderline().run(), children: _jsx(Underline, { className: "h-3.5 w-3.5" }) }) }), _jsx(TooltipContent, { children: _jsxs("div", { className: "flex flex-col items-start gap-0.5", children: [_jsx("span", { children: "Underline" }), _jsx("span", { className: "text-[10px] opacity-70", children: `${modKey} U` })] }) })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { render: _jsx(Button, { variant: editor.isActive('paragraph') ? 'default' : 'ghost', size: "icon", "aria-label": "Text", onClick: () => editor.chain().focus().setParagraph().run(), children: _jsx(Type, { className: "h-3.5 w-3.5" }) }) }), _jsx(TooltipContent, { children: _jsxs("div", { className: "flex flex-col items-start gap-0.5", children: [_jsx("span", { children: "Text" }), _jsx("span", { className: "text-[10px] opacity-70", children: `${modKey} ${altKey} 0` })] }) })] }), _jsx(HeadingMenu, { editor: editor })] }), _jsxs("div", { className: "flex flex-row items-center gap-0.5", children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { render: _jsx(Button, { variant: editor.isActive('bulletList') ? 'default' : 'ghost', size: "icon", "aria-label": "Bullet list", onClick: () => editor.chain().focus().toggleBulletList().run(), children: _jsx(List, { className: "h-3.5 w-3.5" }) }) }), _jsx(TooltipContent, { children: _jsxs("div", { className: "flex flex-col items-start gap-0.5", children: [_jsx("span", { children: "Bullet list" }), _jsx("span", { className: "text-[10px] opacity-70", children: `${modKey} ${shiftKey} 8` })] }) })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { render: _jsx(Button, { variant: editor.isActive('orderedList') ? 'default' : 'ghost', size: "icon", "aria-label": "Ordered list", onClick: () => editor.chain().focus().toggleOrderedList().run(), children: _jsx(ListOrdered, { className: "h-3.5 w-3.5" }) }) }), _jsx(TooltipContent, { children: _jsxs("div", { className: "flex flex-col items-start gap-0.5", children: [_jsx("span", { children: "Ordered list" }), _jsx("span", { className: "text-[10px] opacity-70", children: `${modKey} ${shiftKey} 7` })] }) })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { render: _jsx(Button, { variant: editor.isActive('strike') ? 'default' : 'ghost', size: "icon", "aria-label": "Strikethrough", onClick: () => editor.chain().focus().toggleStrike().run(), children: _jsx(Strikethrough, { className: "h-3.5 w-3.5" }) }) }), _jsx(TooltipContent, { children: _jsxs("div", { className: "flex flex-col items-start gap-0.5", children: [_jsx("span", { children: "Strikethrough" }), _jsx("span", { className: "text-[10px] opacity-70", children: `${modKey} ${shiftKey} S` })] }) })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { render: _jsx(Button, { variant: editor.isActive('codeBlock') ? 'default' : 'ghost', size: "icon", "aria-label": "Code block", onClick: () => editor.chain().focus().toggleCodeBlock().run(), children: _jsx(Code2, { className: "h-3.5 w-3.5" }) }) }), _jsx(TooltipContent, { children: _jsxs("div", { className: "flex flex-col items-start gap-0.5", children: [_jsx("span", { children: "Code block" }), _jsx("span", { className: "text-[10px] opacity-70", children: `${modKey} ${altKey} C` })] }) })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { render: _jsx(Button, { variant: editor.isActive('blockquote') ? 'default' : 'ghost', size: "icon", "aria-label": "Blockquote", onClick: () => editor.chain().focus().toggleBlockquote().run(), children: _jsx(Quote, { className: "h-3.5 w-3.5" }) }) }), _jsx(TooltipContent, { children: _jsxs("div", { className: "flex flex-col items-start gap-0.5", children: [_jsx("span", { children: "Blockquote" }), _jsx("span", { className: "text-[10px] opacity-70", children: `${modKey} ${shiftKey} B` })] }) })] })] }), _jsx(Separator, { className: "my-1" }), _jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsxs(Button, { variant: "ghost", size: "md", className: "justify-start w-full", onClick: () => {
                                                isLockedRef.current = true;
                                                handleAiAction('Enhance the text.');
                                            }, children: [_jsx(Wand2, {}), "Improve writing"] }), _jsxs(Button, { variant: "ghost", size: "md", className: "justify-start w-full", onClick: () => {
                                                isLockedRef.current = true;
                                                handleAiAction('fix-selected-text-grammar');
                                            }, children: [_jsx(SpellCheck, {}), "Fix grammar"] }), _jsxs(Button, { variant: "ghost", size: "md", className: "justify-start w-full", onClick: handleCustomPromptClick, children: [_jsx(Sparkles, {}), "Custom prompt"] })] }), _jsx(Separator, { className: "my-1" }), _jsxs("div", { className: "flex flex-row items-center gap-0.5", children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { render: _jsx(Button, { variant: "ghost", size: "icon", "aria-label": "Cut", onClick: handleCut, children: _jsx(Scissors, { className: "h-3.5 w-3.5" }) }) }), _jsx(TooltipContent, { children: _jsxs("div", { className: "flex flex-col items-start gap-0.5", children: [_jsx("span", { children: "Cut" }), _jsx("span", { className: "text-[10px] opacity-70", children: `${modKey} X` })] }) })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { render: _jsx(Button, { variant: "ghost", size: "icon", "aria-label": "Copy", onClick: handleCopy, children: _jsx(Copy, { className: "h-3.5 w-3.5" }) }) }), _jsx(TooltipContent, { children: _jsxs("div", { className: "flex flex-col items-start gap-0.5", children: [_jsx("span", { children: "Copy" }), _jsx("span", { className: "text-[10px] opacity-70", children: `${modKey} C` })] }) })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { render: _jsx(Button, { variant: "ghost", size: "icon", "aria-label": "Delete", onClick: handleDelete, children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) }) }), _jsx(TooltipContent, { children: _jsxs("div", { className: "flex flex-col items-start gap-0.5", children: [_jsx("span", { children: "Delete" }), _jsx("span", { className: "text-[10px] opacity-70", children: "Delete" })] }) })] })] })] }), _jsx(FloatingArrow, { ref: arrowRef, context: context, className: "fill-card [&>path:first-of-type]:stroke-foreground/10 [&>path:last-of-type]:stroke-card", strokeWidth: 1, tipRadius: 2 })] }) })), _jsx(InputMenu, { open: inputMenuOpen, onOpenChange: handleInputMenuOpenChange, onSubmit: handleInputMenuSubmit, getReferenceRect: getSelectionRect })] }));
});
