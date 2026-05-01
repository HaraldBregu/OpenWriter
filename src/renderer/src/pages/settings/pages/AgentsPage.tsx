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
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/Card';
import { SettingRow } from '../components';
import { PROVIDERS } from '../../../../../shared/types';
import type { AgentSettings, ModelInfo, ProviderId } from '../../../../../shared/types';

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

const TEXT_MODELS: readonly ModelInfo[] = [
	{
		providerId: 'openai',
		modelId: 'gpt-5.4',
		name: 'GPT-5.4',
		type: 'multimodal',
		contextWindow: 1050000,
		maxOutputTokens: 128000,
	},
	{
		providerId: 'openai',
		modelId: 'gpt-5.4-mini',
		name: 'GPT-5.4 Mini',
		type: 'multimodal',
		contextWindow: 400000,
		maxOutputTokens: 128000,
	},
	{
		providerId: 'openai',
		modelId: 'gpt-4.1',
		name: 'GPT-4.1',
		type: 'multimodal',
		contextWindow: 1047576,
		maxOutputTokens: 32768,
	},
	{
		providerId: 'anthropic',
		modelId: 'claude-opus-4-6',
		name: 'Claude Opus 4.6',
		type: 'multimodal',
		contextWindow: 1000000,
		maxOutputTokens: 128000,
	},
	{
		providerId: 'anthropic',
		modelId: 'claude-sonnet-4-6',
		name: 'Claude Sonnet 4.6',
		type: 'multimodal',
		contextWindow: 1000000,
		maxOutputTokens: 64000,
	},
	{
		providerId: 'anthropic',
		modelId: 'claude-haiku-4-5-20251001',
		name: 'Claude Haiku 4.5',
		type: 'multimodal',
		contextWindow: 200000,
		maxOutputTokens: 64000,
	},
];

const IMAGE_MODELS: readonly ModelInfo[] = [
	{
		providerId: 'openai',
		modelId: 'gpt-image-1',
		name: 'GPT Image 1',
		type: 'image',
		contextWindow: null,
		maxOutputTokens: null,
	},
];

function modelsForRole(role: AgentRole): readonly ModelInfo[] {
	return role === 'image' ? IMAGE_MODELS : TEXT_MODELS;
}

function modelsForProvider(role: AgentRole, providerId: ProviderId): readonly ModelInfo[] {
	return modelsForRole(role).filter((m) => m.providerId === providerId);
}

function defaultAgentSettings(def: AgentDefinition): AgentSettings {
	return {
		id: def.id,
		name: def.name,
		models: { [def.role]: def.defaultModelId },
	};
}

function deriveProviderFromAgent(def: AgentDefinition, agent: AgentSettings): ProviderId {
	const modelId = agent.models[def.role];
	const found = modelsForRole(def.role).find((m) => m.modelId === modelId);
	return found?.providerId ?? def.defaultProviderId;
}

const AgentsPage: React.FC = () => {
	const { t } = useTranslation();
	const [agentsById, setAgentsById] = useState<Record<string, AgentSettings>>(() =>
		Object.fromEntries(AGENT_DEFINITIONS.map((def) => [def.id, defaultAgentSettings(def)]))
	);
	const [status, setStatus] = useState<SaveStatus>({ type: 'loading' });

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

	const handleProviderChange = (def: AgentDefinition, providerId: ProviderId) => {
		const candidate = modelsForProvider(def.role, providerId)[0];
		if (!candidate) return;
		const current = agentsById[def.id] ?? defaultAgentSettings(def);
		void persistAgent({
			...current,
			models: { ...current.models, [def.role]: candidate.modelId },
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

			<div className="flex flex-col gap-4">
				{AGENT_DEFINITIONS.map((def) => {
					const agent = agentsById[def.id] ?? defaultAgentSettings(def);
					const providerId = deriveProviderFromAgent(def, agent);
					const modelId = agent.models[def.role] ?? def.defaultModelId;
					const availableModels = modelsForProvider(def.role, providerId);
					const isAgentSaving = status.type === 'saving' && status.agentId === def.id;
					const isAgentSaved = status.type === 'saved' && status.agentId === def.id;

					return (
						<Card key={def.id}>
							<CardHeader>
								<CardTitle>{def.name}</CardTitle>
								<CardDescription>{def.description}</CardDescription>
							</CardHeader>
							<CardContent>
								<SettingRow label={t('settings.agents.provider', 'Provider')}>
									<Select
										value={providerId}
										onValueChange={(next) =>
											next && handleProviderChange(def, next as ProviderId)
										}
										disabled={isBusy}
									>
										<SelectTrigger className="h-8 w-64 text-sm">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="w-72">
											{PROVIDERS.map((provider) => (
												<SelectItem key={provider.id} value={provider.id}>
													{provider.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingRow>

								<SettingRow label={t('settings.agents.model', 'Model')}>
									<Select
										value={modelId}
										onValueChange={(next) => next && handleModelChange(def, next)}
										disabled={isBusy || availableModels.length === 0}
									>
										<SelectTrigger className="h-8 w-64 text-sm">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="w-72">
											{availableModels.map((model) => (
												<SelectItem key={model.modelId} value={model.modelId}>
													{model.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingRow>
							</CardContent>
							<CardFooter className="min-h-10 text-xs text-muted-foreground">
								{isAgentSaving && t('settings.agents.saving', 'Saving...')}
								{isAgentSaved && t('settings.agents.saved', 'Saved')}
							</CardFooter>
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
