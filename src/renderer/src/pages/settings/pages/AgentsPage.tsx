import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemFooter,
	ItemGroup,
	ItemTitle,
} from '@/components/ui/Item';
import { PROVIDERS } from '../../../../../shared/types';
import type {
	AgentModel,
	AgentSettings,
	ProviderId,
	ProviderModelInfo,
} from '../../../../../shared/types';
import { AGENT_DEFINITIONS } from '../../../../../shared/agents';
import type { AgentDefinition } from '../../../../../shared/agents';

type SaveStatus =
	| { type: 'idle' }
	| { type: 'loading' }
	| { type: 'saving'; agentId: string }
	| { type: 'saved'; agentId: string }
	| { type: 'error'; message: string };

function defaultAgentSettings(def: AgentDefinition): AgentSettings {
	return {
		id: def.id,
		name: def.name,
		models: [],
	};
}

const AgentsPage: React.FC = () => {
	const { t } = useTranslation();
	const [agentsById, setAgentsById] = useState<Record<string, AgentSettings>>(() =>
		Object.fromEntries(AGENT_DEFINITIONS.map((def) => [def.id, defaultAgentSettings(def)]))
	);
	const [status, setStatus] = useState<SaveStatus>({ type: 'loading' });

	const [modelsCache, setModelsCache] = useState<Record<string, ProviderModelInfo[]>>({});
	const [loadingByProvider, setLoadingByProvider] = useState<Record<string, boolean>>({});
	const [errorByProvider, setErrorByProvider] = useState<Record<string, string | null>>({});

	useEffect(() => {
		let isMounted = true;

		const loadAgents = async () => {
			try {
				const stored = await window.app.getAgents();
				const storedById = new Map(stored.map((agent) => [agent.id, agent]));
				const merged = Object.fromEntries(
					AGENT_DEFINITIONS.map((def) => {
						const existing = storedById.get(def.id);
						return [def.id, existing ?? defaultAgentSettings(def)];
					})
				);
				if (isMounted) {
					setAgentsById(merged);
					setStatus({ type: 'idle' });
				}
			} catch (error) {
				if (isMounted) {
					setStatus({
						type: 'error',
						message:
							error instanceof Error
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

	const persistAgent = async (next: AgentSettings) => {
		setAgentsById((prev) => ({ ...prev, [next.id]: next }));
		setStatus({ type: 'saving', agentId: next.id });
		try {
			const saved = await window.app.updateAgent(next);
			setAgentsById((prev) => ({ ...prev, [saved.id]: saved }));
			setStatus({ type: 'saved', agentId: next.id });
		} catch (error) {
			setStatus({
				type: 'error',
				message:
					error instanceof Error
						? error.message
						: t('settings.agents.saveError', 'Unable to save agent settings.'),
			});
		}
	};

	const ensureModelsLoaded = useCallback(
		async (providerId: string): Promise<ProviderModelInfo[]> => {
			const cached = modelsCache[providerId];
			if (cached) return cached;

			setLoadingByProvider((prev) => ({ ...prev, [providerId]: true }));
			setErrorByProvider((prev) => ({ ...prev, [providerId]: null }));
			try {
				const fetched = await window.app.getModels(providerId);
				setModelsCache((prev) => ({ ...prev, [providerId]: fetched }));
				return fetched;
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: t('settings.agents.modelsLoadError', 'Unable to load models.');
				setErrorByProvider((prev) => ({ ...prev, [providerId]: message }));
				return [];
			} finally {
				setLoadingByProvider((prev) => ({ ...prev, [providerId]: false }));
			}
		},
		[modelsCache, t]
	);

	// Auto-fetch models for any provider already wired up on a stored agent
	useEffect(() => {
		const providerIds = new Set<string>();
		Object.values(agentsById).forEach((agent) => {
			agent.models.forEach((m) => {
				if (m.providerId) providerIds.add(m.providerId);
			});
		});
		providerIds.forEach((pid) => {
			if (!modelsCache[pid] && !loadingByProvider[pid] && !errorByProvider[pid]) {
				void ensureModelsLoaded(pid);
			}
		});
	}, [agentsById, modelsCache, loadingByProvider, errorByProvider, ensureModelsLoaded]);

	const handleProviderChange = async (def: AgentDefinition, providerId: ProviderId) => {
		const current = agentsById[def.id] ?? defaultAgentSettings(def);
		const existingId = current.models[0]?.id ?? crypto.randomUUID();
		const cleared: AgentSettings = {
			...current,
			models: [{ id: existingId, providerId, modelId: '' }],
		};
		await persistAgent(cleared);

		const fetched = await ensureModelsLoaded(providerId);
		const candidate = fetched[0];
		if (!candidate) return;

		void persistAgent({
			...cleared,
			models: [{ id: existingId, providerId, modelId: candidate.id }],
		});
	};

	const handleModelChange = (def: AgentDefinition, modelId: string) => {
		const current = agentsById[def.id] ?? defaultAgentSettings(def);
		const existing: AgentModel | undefined = current.models[0];
		if (!existing) return;
		void persistAgent({
			...current,
			models: [{ ...existing, modelId }],
		});
	};

	const isBusy = status.type === 'loading';

	return (
		<div className="w-full max-w-2xl">
			<h1 className="text-lg font-normal mb-1">{t('settings.agents.title', 'Agents')}</h1>
			<p className="text-sm text-muted-foreground mb-6">
				{t(
					'settings.agents.subtitle',
					'Configure the model assignments each agent uses for its work.'
				)}
			</p>

			<ItemGroup>
				{AGENT_DEFINITIONS.map((def) => {
					const agent = agentsById[def.id] ?? defaultAgentSettings(def);
					const firstModel = agent.models[0];
					const providerId = firstModel?.providerId ?? '';
					const modelId = firstModel?.modelId ?? '';
					const availableModels = providerId ? (modelsCache[providerId] ?? []) : [];
					const isLoadingModels = providerId ? Boolean(loadingByProvider[providerId]) : false;
					const providerError = providerId ? errorByProvider[providerId] : null;
					const isAgentSaving = status.type === 'saving' && status.agentId === def.id;
					const isAgentSaved = status.type === 'saved' && status.agentId === def.id;

					return (
						<Item key={def.id} variant="outline">
							<ItemContent>
								<ItemTitle>{def.name}</ItemTitle>
								<ItemDescription>{def.description}</ItemDescription>
							</ItemContent>
							<ItemActions>
								<Select
									value={providerId}
									onValueChange={(next) =>
										next && void handleProviderChange(def, next as ProviderId)
									}
									disabled={isBusy}
								>
									<SelectTrigger className="h-8 w-44 text-sm">
										<SelectValue
											placeholder={t('settings.agents.providerPlaceholder', 'Select provider')}
										/>
									</SelectTrigger>
									<SelectContent className="w-56">
										{PROVIDERS.map((provider) => (
											<SelectItem key={provider.id} value={provider.id}>
												{provider.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{providerId && (
									<Select
										value={modelId}
										onValueChange={(next) => next && handleModelChange(def, next)}
										disabled={isBusy || isLoadingModels || availableModels.length === 0}
									>
										<SelectTrigger className="h-8 w-44 text-sm">
											<SelectValue
												placeholder={
													isLoadingModels
														? t('settings.agents.modelsLoading', 'Loading…')
														: t('settings.agents.modelPlaceholder', 'Select model')
												}
											/>
										</SelectTrigger>
										<SelectContent className="w-56">
											{availableModels.map((model) => (
												<SelectItem key={model.id} value={model.id}>
													{model.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
								<span className="ml-2 text-xs text-muted-foreground">
									{isAgentSaving && t('settings.agents.saving', 'Saving...')}
									{isAgentSaved && t('settings.agents.saved', 'Saved')}
								</span>
							</ItemActions>
							{providerError && (
								<ItemFooter>
									<p className="text-xs text-destructive">{providerError}</p>
								</ItemFooter>
							)}
						</Item>
					);
				})}
			</ItemGroup>

			{status.type === 'error' && (
				<div className="pt-3 text-xs text-destructive">{status.message}</div>
			)}
		</div>
	);
};

export default AgentsPage;
