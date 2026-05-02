import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { GlowingEffect } from '@/components/ui/GlowingEffect';
import { Textarea } from '@/components/ui/Textarea';
import { FileUpload, FileUploadDropzone, FileUploadTrigger } from '@/components/ui/FileUpload';
import { usePrompt } from './hooks';
import { Provider } from './Provider';
import { PromptHeader } from './PromptHeader';
import { Paperclip, LoaderCircle, SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';
function PromptStatusBar() {
    const { statusBarVisible, statusBarMessage } = usePrompt();
    if (!statusBarVisible)
        return null;
    return (_jsx("div", { className: "mt-2 w-full", children: _jsxs("div", { role: 'alert', className: "flex items-center gap-2 rounded-t-md px-3 py-1.5 text-xs text-muted-foreground", children: [_jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }), _jsx("span", { children: statusBarMessage })] }) }));
}
function PromptContainer() {
    const { t } = useTranslation();
    const { state, loading, enable, isSubmitDisabled, textareaRef, submitRef, handlePromptChange, handleFilesChange, resizeTextarea, } = usePrompt();
    const inputLabel = t('assistantNode.textTitle', 'Generate text');
    const isDisabled = !enable || loading;
    return (_jsx(FileUpload, { accept: ACCEPTED_IMAGE_TYPES, multiple: true, disabled: isDisabled, value: state.files, onValueChange: handleFilesChange, children: _jsxs(FileUploadDropzone
        // Prevents the dropzone from triggering on click
        , { 
            // Prevents the dropzone from triggering on click
            onClick: (event) => event.preventDefault(), className: "w-full gap-0 rounded-none border-0 p-0 hover:bg-transparent focus-visible:border-transparent", children: [_jsx(PromptStatusBar, {}), _jsxs("div", { className: "relative mb-2 w-full", children: [_jsx("div", { "aria-hidden": "true", className: "pointer-events-none absolute inset-x-6 top-8 bottom-0 -z-10 rounded-full bg-[radial-gradient(circle_at_12%_50%,hsl(195_96%_61%/0.26),transparent_32%),radial-gradient(circle_at_50%_100%,hsl(30_95%_61%/0.28),transparent_38%),radial-gradient(circle_at_88%_45%,hsl(270_91%_68%/0.24),transparent_32%)] opacity-70 blur-2xl dark:bg-[radial-gradient(circle_at_12%_50%,hsl(195_96%_61%/0.22),transparent_32%),radial-gradient(circle_at_50%_100%,hsl(30_95%_61%/0.26),transparent_38%),radial-gradient(circle_at_88%_45%,hsl(270_91%_68%/0.26),transparent_32%)]" }), _jsxs("div", { className: "relative rounded-xl", children: [_jsx(GlowingEffect, { blur: 0, borderWidth: 2, spread: 80, glow: true, disabled: false, proximity: 64, inactiveZone: 0.01 }), _jsxs(Card, { className: "relative w-full shadow-none!", children: [_jsx(PromptHeader, {}), _jsx(CardContent, { children: _jsx(Textarea, { ref: textareaRef, value: state.prompt, onChange: (e) => {
                                                    handlePromptChange(e.target.value);
                                                    resizeTextarea();
                                                }, disabled: !enable, "aria-label": inputLabel, className: cn('disabled:bg-transparent! disabled:focus:bg-transparent!', 'p-0 rounded-none w-full resize-none border-none bg-transparent dark:bg-transparent focus:bg-transparent text-[15px] leading-7 text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0', 'placeholder:text-foreground/42 dark:placeholder:text-muted-foreground/78', 'disabled:cursor-not-allowed disabled:opacity-60'), placeholder: t('assistantNode.placeholder', 'What can i write for you?'), rows: 1 }) }), _jsxs(CardFooter, { className: "bg-transparent border-none", children: [_jsx(FileUploadTrigger, { render: _jsx(Button, { type: "button", variant: "outline", size: "icon", title: t('assistantNode.addAttachment', 'Add attachment'), "aria-label": t('assistantNode.addAttachment', 'Add attachment') }), children: _jsx(Paperclip, {}) }), _jsxs(Button, { variant: "default", className: "ml-auto shrink-0", disabled: isSubmitDisabled, onMouseDown: (e) => e.preventDefault(), onClick: () => {
                                                        if (!loading)
                                                            submitRef.current?.();
                                                    }, "aria-label": t('agenticPanel.submit', 'Submit'), children: [loading ? _jsx(LoaderCircle, { className: "animate-spin" }) : _jsx(SendHorizontal, {}), _jsx("span", { children: t('agenticPanel.submit', 'Submit') })] })] })] })] })] })] }) }));
}
export function Prompt({ nodeViewProps }) {
    return (_jsx(Provider, { nodeViewProps: nodeViewProps, children: _jsx(PromptContainer, {}) }));
}
