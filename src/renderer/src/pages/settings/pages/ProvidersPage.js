import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { PROVIDER_IDS, PROVIDER_CATALOGUE, getProvider } from '../../../../../shared/providers';
import { Button } from '@/components/ui/Button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { PageBody, PageContainer, PageHeader, PageHeaderDescription, PageHeaderTitle, } from '@/components/app/base/page';
const PROVIDER_LABELS = PROVIDER_IDS.reduce((acc, id) => {
    acc[id] = PROVIDER_CATALOGUE.find((p) => p.id === id)?.name ?? id;
    return acc;
}, {});
const buildKeyMap = (providers) => {
    const map = {};
    for (const id of PROVIDER_IDS) {
        map[id] = providers.find((p) => p.id === id)?.apiKey ?? '';
    }
    return map;
};
const ProvidersPage = () => {
    const { t } = useTranslation();
    const [providers, setProviders] = useState([]);
    const [drafts, setDrafts] = useState(() => buildKeyMap([]));
    const [saving, setSaving] = useState(() => new Set());
    const existingKeys = useMemo(() => buildKeyMap(providers), [providers]);
    const loadProviders = useCallback(async () => {
        const loaded = await window.app.getProviders();
        setProviders(loaded);
        return loaded;
    }, []);
    useEffect(() => {
        loadProviders().catch(() => setProviders([]));
    }, [loadProviders]);
    useEffect(() => {
        setDrafts(existingKeys);
    }, [existingKeys]);
    const handleSaveOne = useCallback(async (providerId) => {
        const apiKey = (drafts[providerId] ?? '').trim();
        if (apiKey.length === 0 || apiKey === existingKeys[providerId])
            return;
        const catalog = getProvider(providerId);
        if (!catalog)
            return;
        setSaving((prev) => {
            const next = new Set(prev);
            next.add(providerId);
            return next;
        });
        try {
            await window.app.addProvider({ id: catalog.id, name: catalog.name, apiKey });
            await loadProviders();
        }
        finally {
            setSaving((prev) => {
                const next = new Set(prev);
                next.delete(providerId);
                return next;
            });
        }
    }, [drafts, existingKeys, loadProviders]);
    return (_jsxs(PageContainer, { children: [_jsxs(PageHeader, { className: "px-0 border-none", children: [_jsx(PageHeaderTitle, { children: t('settings.providers.title', 'Providers') }), _jsx(PageHeaderDescription, { children: t('models.defaultProviders.subtitle', 'Configure API keys for the most important providers.') })] }), _jsx(PageBody, { className: "px-0", children: _jsx(FieldGroup, { className: "max-w-2xl", children: PROVIDER_IDS.map((providerId) => {
                        const isSaving = saving.has(providerId);
                        const draftValue = drafts[providerId] ?? '';
                        const isDirty = draftValue.trim() !== existingKeys[providerId];
                        return (_jsx("form", { onSubmit: (e) => {
                                e.preventDefault();
                                void handleSaveOne(providerId);
                            }, children: _jsxs(Field, { children: [_jsx(FieldLabel, { htmlFor: `provider-${providerId}`, children: PROVIDER_LABELS[providerId] }), _jsxs(Field, { orientation: "horizontal", children: [_jsx(Input, { id: `provider-${providerId}`, type: "password", value: draftValue, onChange: (e) => setDrafts((prev) => ({
                                                    ...prev,
                                                    [providerId]: e.target.value,
                                                })), placeholder: t('models.form.apiKeyPlaceholder', 'Enter API key…'), autoComplete: "off", spellCheck: false, disabled: isSaving }), _jsx(Button, { type: "submit", size: "icon", disabled: !isDirty || isSaving, "aria-label": t('common.save', 'Save'), children: isSaving ? _jsx(Spinner, {}) : _jsx(Save, {}) })] })] }) }, providerId));
                    }) }) })] }));
};
export default ProvidersPage;
