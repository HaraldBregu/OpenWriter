import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/Select';
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemTitle, } from '@/components/ui/Item';
import { PROVIDERS } from '../../../../../shared/types';
import { AGENT_DEFINITIONS } from '../../../../../shared/agents';
function defaultAgentSettings(def) {
    return {
        id: def.id,
        name: def.name,
        models: [],
    };
}
const AgentsPage = () => {
    const { t } = useTranslation();
    const [agentsById, setAgentsById] = useState(() => Object.fromEntries(AGENT_DEFINITIONS.map((def) => [def.id, defaultAgentSettings(def)])));
    const [status, setStatus] = useState({ type: 'loading' });
    const [modelsCache, setModelsCache] = useState({});
    const [loadingByProvider, setLoadingByProvider] = useState({});
    const [errorByProvider, setErrorByProvider] = useState({});
    useEffect(() => {
        let isMounted = true;
        const loadAgents = async () => {
            try {
                const stored = await window.app.getAgents();
                const storedById = new Map(stored.map((agent) => [agent.id, agent]));
                const merged = Object.fromEntries(AGENT_DEFINITIONS.map((def) => {
                    const existing = storedById.get(def.id);
                    return [def.id, existing ?? defaultAgentSettings(def)];
                }));
                if (isMounted) {
                    setAgentsById(merged);
                    setStatus({ type: 'idle' });
                }
            }
            catch (error) {
                if (isMounted) {
                    setStatus({
                        type: 'error',
                        message: error instanceof Error
                            ? error.message
                            : t('settings.agents.loadError', 'Unable to load agent settings.'),
                    });
                }
            }
        };
        void loadAgents();
        return () => {
            isMounted = false;
        };
    }, [t]);
    const persistAgent = async (next) => {
        setAgentsById((prev) => ({ ...prev, [next.id]: next }));
        setStatus({ type: 'saving', agentId: next.id });
        try {
            const saved = await window.app.updateAgent(next);
            setAgentsById((prev) => ({ ...prev, [saved.id]: saved }));
            setStatus({ type: 'saved', agentId: next.id });
        }
        catch (error) {
            setStatus({
                type: 'error',
                message: error instanceof Error
                    ? error.message
                    : t('settings.agents.saveError', 'Unable to save agent settings.'),
            });
        }
    };
    const ensureModelsLoaded = useCallback(async (providerId) => {
        const cached = modelsCache[providerId];
        if (cached)
            return cached;
        setLoadingByProvider((prev) => ({ ...prev, [providerId]: true }));
        setErrorByProvider((prev) => ({ ...prev, [providerId]: null }));
        try {
            const fetched = await window.app.getModels(providerId);
            setModelsCache((prev) => ({ ...prev, [providerId]: fetched }));
            return fetched;
        }
        catch (error) {
            const message = error instanceof Error
                ? error.message
                : t('settings.agents.modelsLoadError', 'Unable to load models.');
            setErrorByProvider((prev) => ({ ...prev, [providerId]: message }));
            return [];
        }
        finally {
            setLoadingByProvider((prev) => ({ ...prev, [providerId]: false }));
        }
    }, [modelsCache, t]);
    // Auto-fetch models for any provider already wired up on a stored agent
    useEffect(() => {
        const providerIds = new Set();
        Object.values(agentsById).forEach((agent) => {
            agent.models.forEach((m) => {
                if (m.providerId)
                    providerIds.add(m.providerId);
            });
        });
        providerIds.forEach((pid) => {
            if (!modelsCache[pid] && !loadingByProvider[pid] && !errorByProvider[pid]) {
                void ensureModelsLoaded(pid);
            }
        });
    }, [agentsById, modelsCache, loadingByProvider, errorByProvider, ensureModelsLoaded]);
    const handleProviderChange = async (def, providerId) => {
        const current = agentsById[def.id] ?? defaultAgentSettings(def);
        const existingId = current.models[0]?.id ?? crypto.randomUUID();
        const cleared = {
            ...current,
            models: [{ id: existingId, providerId, modelId: '' }],
        };
        await persistAgent(cleared);
        const fetched = await ensureModelsLoaded(providerId);
        const candidate = fetched[0];
        if (!candidate)
            return;
        void persistAgent({
            ...cleared,
            models: [{ id: existingId, providerId, modelId: candidate.id }],
        });
    };
    const handleModelChange = (def, modelId) => {
        const current = agentsById[def.id] ?? defaultAgentSettings(def);
        const existing = current.models[0];
        if (!existing)
            return;
        void persistAgent({
            ...current,
            models: [{ ...existing, modelId }],
        });
    };
    const isBusy = status.type === 'loading';
    return (_jsxs("div", { className: "w-full max-w-2xl", children: [_jsx("h1", { className: "text-lg font-normal mb-1", children: t('settings.agents.title', 'Agents') }), _jsx("p", { className: "text-sm text-muted-foreground mb-6", children: t('settings.agents.subtitle', 'Configure the model assignments each agent uses for its work.') }), _jsx(ItemGroup, { children: AGENT_DEFINITIONS.map((def) => {
                    const agent = agentsById[def.id] ?? defaultAgentSettings(def);
                    const firstModel = agent.models[0];
                    const providerId = firstModel?.providerId ?? '';
                    const modelId = firstModel?.modelId ?? '';
                    const availableModels = providerId ? (modelsCache[providerId] ?? []) : [];
                    const isLoadingModels = providerId ? Boolean(loadingByProvider[providerId]) : false;
                    const providerError = providerId ? errorByProvider[providerId] : null;
                    const isAgentSaving = status.type === 'saving' && status.agentId === def.id;
                    const isAgentSaved = status.type === 'saved' && status.agentId === def.id;
                    return (_jsxs(Item, { variant: "outline", children: [_jsxs(ItemContent, { children: [_jsx(ItemTitle, { children: def.name }), _jsx(ItemDescription, { children: def.description })] }), _jsxs(ItemActions, { children: [_jsxs(Select, { value: providerId, onValueChange: (next) => next && void handleProviderChange(def, next), disabled: isBusy, children: [_jsx(SelectTrigger, { className: "h-8 w-44 text-sm", children: _jsx(SelectValue, { placeholder: t('settings.agents.providerPlaceholder', 'Select provider') }) }), _jsx(SelectContent, { className: "w-56", children: PROVIDERS.map((provider) => (_jsx(SelectItem, { value: provider.id, children: provider.name }, provider.id))) })] }), providerId && (_jsxs(Select, { value: modelId, onValueChange: (next) => next && handleModelChange(def, next), disabled: isBusy || isLoadingModels || availableModels.length === 0, children: [_jsx(SelectTrigger, { className: "h-8 w-44 text-sm", children: _jsx(SelectValue, { placeholder: isLoadingModels
                                                        ? t('settings.agents.modelsLoading', 'Loading…')
                                                        : t('settings.agents.modelPlaceholder', 'Select model') }) }), _jsx(SelectContent, { className: "w-56", children: availableModels.map((model) => (_jsx(SelectItem, { value: model.id, children: model.name }, model.id))) })] })), _jsxs("span", { className: "ml-2 text-xs text-muted-foreground", children: [isAgentSaving && t('settings.agents.saving', 'Saving...'), isAgentSaved && t('settings.agents.saved', 'Saved')] })] }), providerError && (_jsx(ItemFooter, { children: _jsx("p", { className: "text-xs text-destructive", children: providerError }) }))] }, def.id));
                }) }), status.type === 'error' && (_jsx("div", { className: "pt-3 text-xs text-destructive", children: status.message }))] }));
};
export default AgentsPage;
