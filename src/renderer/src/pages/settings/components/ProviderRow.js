import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { PROVIDER_IDS, PROVIDER_CATALOGUE } from '../../../../../shared/providers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SettingRow } from './SettingRow';
const PROVIDER_LABELS = PROVIDER_IDS.reduce((acc, providerId) => {
    const label = PROVIDER_CATALOGUE.find((provider) => provider.id === providerId)?.name ?? providerId;
    acc[providerId] = label;
    return acc;
}, {});
const MASKED_API_KEY = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
export const ProviderRow = ({ provider, existingKey, onSave }) => {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const inputId = useId();
    const hasKey = existingKey.length > 0;
    const handleEdit = useCallback(() => {
        setDraft('');
        setEditing(true);
    }, []);
    const handleCancel = useCallback(() => {
        setDraft('');
        setEditing(false);
    }, []);
    const handleConfirm = useCallback(async () => {
        const trimmed = draft.trim();
        if (trimmed.length === 0 || saving)
            return;
        setSaving(true);
        try {
            await onSave(provider, trimmed);
            setDraft('');
            setEditing(false);
        }
        catch {
            // Save failed — keep input so user can retry
        }
        finally {
            setSaving(false);
        }
    }, [draft, onSave, provider, saving]);
    return (_jsx(SettingRow, { label: PROVIDER_LABELS[provider], labelFor: editing ? inputId : undefined, children: editing ? (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(Input, { id: inputId, type: "password", value: draft, onChange: (e) => setDraft(e.target.value), placeholder: t('models.form.apiKeyPlaceholder', 'Enter API key\u2026'), autoComplete: "off", spellCheck: false, autoFocus: true, className: "h-7 w-48 text-xs font-mono", onKeyDown: (e) => {
                        if (e.key === 'Enter')
                            void handleConfirm();
                        if (e.key === 'Escape')
                            handleCancel();
                    } }), _jsx(Button, { type: "button", variant: "ghost", size: "icon-xs", "aria-label": t('models.form.save', 'Save'), disabled: draft.trim().length === 0 || saving, onClick: () => void handleConfirm(), children: saving ? _jsx(Loader2, { className: "animate-spin" }) : _jsx(Check, {}) }), _jsx(Button, { type: "button", variant: "ghost", size: "icon-xs", "aria-label": t('common.cancel', 'Cancel'), disabled: saving, onClick: handleCancel, className: "text-muted-foreground hover:text-destructive", children: _jsx(X, {}) })] })) : (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-sm font-mono text-muted-foreground", children: hasKey ? MASKED_API_KEY : t('models.form.notSet', 'Not set') }), _jsx(Button, { type: "button", variant: "ghost", size: "icon-xs", "aria-label": t('common.edit', 'Edit'), onClick: handleEdit, className: "text-muted-foreground hover:text-foreground", children: _jsx(Pencil, {}) })] })) }));
};
