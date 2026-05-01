import React, { useEffect, useState } from 'react';
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
import type { AgentSettings, ProviderId, ProviderModelInfo } from '../../../../../shared/types';

type SaveStatus =
	| { type: 'idle' }
	| { type: 'loading' }
	| { type: 'saving'; agentId: string }
	| { type: 'saved'; agentId: string }
	| { type: 'error'; message: string };

type AgentRole = 'text' | 'image';

interface AgentDefinition {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly role: AgentRole;
}

const AGENT_DEFINITIONS: readonly AgentDefinition[] = [
	{
		id: 'content-reviewer',
		name: 'Content Reviewer',
		description: 'Reviews drafts for clarity, tone, and structural issues before publishing.',
		role: 'text',
	},
	{
		id: 'content-writer',
		name: 'Content Writer',
		description: 'Drafts long-form articles, posts, and structured documents from a prompt.',
		role: 'text',
	},
	{
		id: 'image-creator',
		name: 'Image Creator',
		description: 'Generates illustrations, hero images, and graphics from a text prompt.',
		role: 'image',
	},
	{
		id: 'assistant',
		name: 'Personal Assistant',
		description: 'Answers questions, summarises selections, and assists while you write.',
		role: 'text',
	},
];

function defaultAgentSettings(def: AgentDefinition): AgentSettings {
	return {
		id: def.id,
		name: def.name,
		models: {},
	};
}

const AgentsPage: React.FC = () => {
	const { t } = useTranslation();
	const [agentsById, setAgentsById] = useState<Record<string, AgentSettings>>(() =>
		Object.fromEntries(AGENT_DEFINITIONS.map((def) => [def.id, defaultAgentSettings(def)]))
	);
	const [status, setStatus] = useState<SaveStatus>({ type: 'loading' });

	const [providerByAgent, setProviderByAgent] = useState<Record<string, ProviderId | null>>(() =>
		Object.fromEntries(AGENT_DEFINITIONS.map((def) => [def.id, null]))
	);
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

	const ensureModelsLoaded = async (providerId: ProviderId): Promise<ProviderModelInfo[]> => {
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
	};

	const handleProviderChange = async (def: AgentDefinition, providerId: ProviderId) => {
		setProviderByAgent((prev) => ({ ...prev, [def.id]: providerId }));
		const current = agentsById[def.id] ?? defaultAgentSettings(def);
		// Clear previous model selection until the new provider's models load
		await persistAgent({
			...current,
			models: { ...current.models, [def.role]: '' },
		});

		const models = await ensureModelsLoaded(providerId);
		const candidate = models[0];
		if (!candidate) return;

		const latest = agentsById[def.id] ?? current;
		void persistAgent({
			...latest,
			models: { ...latest.models, [def.role]: candidate.id },
		});
	};

	const handleModelChange = (def: AgentDefinition, modelId: string) => {
		const current = agentsById[def.id] ?? defaultAgentSettings(def);
		void persistAgent({
			...current,
			models: { ...current.models, [def.role]: modelId },
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
					const providerId = providerByAgent[def.id] ?? null;
					const modelId = agent.models[def.role] ?? '';
					const availableModels = providerId ? (modelsCache[providerId] ?? []) : [];
					const isLoadingModels = providerId ? Boolean(loadingByProvider[providerId]) : false;
					const providerError = providerId ? errorByProvider[providerId] : null;
					const isAgentSaving = status.type === 'saving' && status.agentId === def.id;
					const isAgentSaved = status.type === 'saved' && status.agentId === def.id;

					return (
						<Card key={def.id}>
							<CardHeader>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<CardTitle>{def.name}</CardTitle>
										<CardDescription>{def.description}</CardDescription>
									</div>
									<span className="shrink-0 text-xs text-muted-foreground">
										{isAgentSaving && t('settings.agents.saving', 'Saving...')}
										{isAgentSaved && t('settings.agents.saved', 'Saved')}
									</span>
								</div>
							</CardHeader>
							<CardContent>
								<SettingRow label={t('settings.agents.assignment', 'Provider & Model')}>
									<div className="flex items-center gap-2">
										<Select
											value={providerId ?? ''}
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
									</div>
								</SettingRow>
								{providerError && (
									<p className="mt-2 text-xs text-destructive">{providerError}</p>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>

			{status.type === 'error' && (
				<div className="pt-3 text-xs text-destructive">{status.message}</div>
			)}
		</div>
	);
};

export default AgentsPage;
