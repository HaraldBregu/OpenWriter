import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from '@/components/ui/AlertDialog';
/**
 * Generic error dialog. Single dismiss action — use for surfaced failures
 * that the user just needs to acknowledge (e.g. failed task results).
 */
export function ErrorDialog({ open, onOpenChange, title, description, dismissLabel, onDismiss, }) {
    const { t } = useTranslation();
    const handleDismiss = () => {
        onDismiss?.();
        onOpenChange(false);
    };
    return (_jsx(AlertDialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(AlertDialogContent, { size: "sm", children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: title ?? t('common.error', 'Something went wrong') }), _jsx(AlertDialogDescription, { children: description })] }), _jsx(AlertDialogFooter, { children: _jsx(AlertDialogAction, { className: "col-span-2 w-full", onClick: handleDismiss, children: dismissLabel ?? t('common.ok', 'OK') }) })] }) }));
}
