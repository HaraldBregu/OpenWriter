import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
import { DEFAULT_AGENTS } from '../../../../shared/types';
import type { AgentProviderConfig } from '../../../../shared/types';
import {
	getChatModelsForProvider,
	getProvidersForDisplay,
} from '../../../../shared/provider-constants';
import {
	AppButton,
	AppLabel,
	AppSelect,
	AppSelectContent,
	AppSelectItem,
	AppSelectTrigger,
	AppSelectValue,
} from '@/components/app';

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const AgentsSettingsPage: React.FC = () => {
	const { t } = useTranslation();
	const [selectedConfigs, setSelectedConfigs] = useState<Record<string, AgentProviderConfig>>({});
	const [savedConfigs, setSavedConfigs] = useState<Record<string, AgentProviderConfig>>({});
	const [savingByAgent, setSavingByAgent] = useState<Record<string, boolean>>({});

	const catalogueProviders = useMemo(() => getProvidersForDisplay(), []);
	const defaultProviderId = catalogueProviders[0]?.id ?? '';

	useEffect(() => {
		let active = true;

		async function load(): Promise<void> {
			if (typeof window.workspace?.getAgentConfigs !== 'function') {
				return;
			}

			try {
				const saved = await window.workspace.getAgentConfigs();
				if (!active) return;

				const providerIds = catalogueProviders.map((p) => p.id);
				const nextSaved: Record<string, AgentProviderConfig> = {};
				const nextSelected: Record<string, AgentProviderConfig> = {};

				for (const agent of DEFAULT_AGENTS) {
					const savedConfig = saved[agent.id];
					const provider =
						savedConfig?.provider && providerIds.includes(savedConfig.provider)
							? savedConfig.provider
							: defaultProviderId;
					const models = getChatModelsForProvider(provider);
					const model =
						savedConfig?.model && models.some((m) => m.id === savedConfig.model)
							? savedConfig.model
							: getFirstChatModel(provider);
					const config = { provider, model };
					nextSaved[agent.id] = config;
					nextSelected[agent.id] = config;
				}

				setSavedConfigs(nextSaved);
				setSelectedConfigs(nextSelected);
			} catch {
				if (!active) return;
				setSavedConfigs({});
				setSelectedConfigs({});
			}
		}

		void load();

		return () => {
			active = false;
		};
	}, [catalogueProviders, defaultProviderId]);

	const handleProviderChange = useCallback((agentId: string, providerName: string) => {
		const model = getFirstChatModel(providerName);
		setSelectedConfigs((prev) => ({
			...prev,
			[agentId]: { provider: providerName, model },
		}));
	}, []);

	const handleModelChange = useCallback((agentId: string, modelId: string) => {
		setSelectedConfigs((prev) => ({
			...prev,
			[agentId]: { ...prev[agentId], model: modelId },
		}));
	}, []);

	const handleSave = useCallback(
		async (agentId: string) => {
			const config = selectedConfigs[agentId];
			if (
				!config?.provider ||
				!config?.model ||
				typeof window.workspace?.setAgentConfig !== 'function'
			) {
				return;
			}

			setSavingByAgent((prev) => ({ ...prev, [agentId]: true }));
			try {
				await window.workspace.setAgentConfig(agentId, config.provider, config.model);
				setSavedConfigs((prev) => ({ ...prev, [agentId]: { ...config } }));
			} finally {
				setSavingByAgent((prev) => ({ ...prev, [agentId]: false }));
			}
		},
		[selectedConfigs]
	);

	const isChanged = useCallback(
		(agentId: string): boolean => {
			const selected = selectedConfigs[agentId];
			const saved = savedConfigs[agentId];
			if (!selected) return false;
			return selected.provider !== saved?.provider || selected.model !== saved?.model;
		},
		[selectedConfigs, savedConfigs]
	);

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.agents.title')}</h1>

			<div className="space-y-4">
				{DEFAULT_AGENTS.map((agent) => {
					const config = selectedConfigs[agent.id];
					const models = getChatModelsForProvider(config?.provider ?? '');

					return (
						<div
							key={agent.id}
							className="rounded-lg border border-border bg-card p-4 shadow-sm transition-colors"
						>
							<div className="mb-3">
								<h2 className="text-sm font-medium text-foreground">{agent.name}</h2>
								<p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>
							</div>

							<div className="space-y-3">
								<div>
									<AppLabel className="text-xs font-medium text-muted-foreground">
										{t('settings.agents.providerLabel', 'Provider')}
									</AppLabel>
									<div className="mt-1">
										<AppSelect
											value={config?.provider ?? ''}
											onValueChange={(value) => handleProviderChange(agent.id, value)}
											disabled={catalogueProviders.length === 0}
										>
											<AppSelectTrigger className="h-9 text-sm">
												<AppSelectValue
													placeholder={t('settings.agents.noProviders', 'No providers configured')}
												/>
											</AppSelectTrigger>
											<AppSelectContent>
												{catalogueProviders.map((provider) => (
													<AppSelectItem
														key={`${agent.id}-provider-${provider.id}`}
														value={provider.id}
													>
														{provider.name}
													</AppSelectItem>
												))}
											</AppSelectContent>
										</AppSelect>
									</div>
								</div>

								<div>
									<AppLabel className="text-xs font-medium text-muted-foreground">
										{t('settings.agents.modelLabel', 'Model')}
									</AppLabel>
									<div className="mt-1 flex items-center gap-2">
										<AppSelect
											value={config?.model ?? ''}
											onValueChange={(value) => handleModelChange(agent.id, value)}
											disabled={models.length === 0}
										>
											<AppSelectTrigger className="h-9 text-sm flex-1">
												<AppSelectValue
													placeholder={t('settings.agents.noModels', 'No models available')}
												/>
											</AppSelectTrigger>
											<AppSelectContent>
												{models.map((model) => (
													<AppSelectItem key={`${agent.id}-model-${model.id}`} value={model.id}>
														{model.name}
													</AppSelectItem>
												))}
											</AppSelectContent>
										</AppSelect>
										<AppButton
											type="button"
											variant="ghost"
											size="icon-xs"
											aria-label={t('settings.agents.saveProvider', 'Save provider')}
											disabled={
												catalogueProviders.length === 0 ||
												!isChanged(agent.id) ||
												Boolean(savingByAgent[agent.id])
											}
											onClick={() => {
												void handleSave(agent.id);
											}}
										>
											{savingByAgent[agent.id] ? <Loader2 className="animate-spin" /> : <Check />}
										</AppButton>
									</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFirstChatModel(providerName: string): string {
	const catalogue = PROVIDER_CATALOGUE.find((p) => p.id === providerName);
	const chatModel = catalogue?.models.find((m) => m.category === 'chat');
	return chatModel?.id ?? '';
}

export default AgentsSettingsPage;
