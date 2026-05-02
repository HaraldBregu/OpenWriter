import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from '@/components/ui/AlertDialog';
export function DeleteConfirmDialog({ open, onOpenChange, title, description, onConfirm, onCancel, confirmLabel, cancelLabel, }) {
    const { t } = useTranslation();
    const handleCancel = () => {
        onCancel?.();
        onOpenChange(false);
    };
    return (_jsx(AlertDialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(AlertDialogContent, { size: "sm", children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: title }), _jsx(AlertDialogDescription, { children: description })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { onClick: handleCancel, children: cancelLabel ?? t('common.cancel') }), _jsx(AlertDialogAction, { variant: "destructive", onClick: onConfirm, children: confirmLabel ?? t('common.delete') })] })] }) }));
}
