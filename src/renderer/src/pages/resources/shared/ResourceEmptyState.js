import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
export const ResourceEmptyState = memo(function ResourceEmptyState({ icon: Icon, message, uploadLabel, uploading, onUpload, }) {
    return (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 text-muted-foreground", children: [_jsx(Icon, { className: "mb-3 h-10 w-10 opacity-40" }), _jsx("p", { className: "text-sm", children: message }), _jsxs(Button, { variant: "outline", size: "sm", className: "mt-4", onClick: onUpload, disabled: uploading, children: [_jsx(Upload, { className: "mr-1.5 h-3.5 w-3.5" }), uploadLabel] })] }));
});
