import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { PenTool, Palette, Loader2, Bot } from 'lucide-react';
import { aiProviders } from '@/config/ai-providers';
import {
	AppBadge,
	AppCard,
	AppCardContent,
	AppCardHeader,
	AppCardTitle,
	AppLabel,
	AppSelect,
	AppSelectContent,
	AppSelectGroup,
	AppSelectItem,
	AppSelectLabel,
	AppSelectTrigger,
	AppSelectValue,
} from '@/components/app';
import { AGENT_IDS, DEFAULT_AGENT_CONFIG } from '../../../../shared/aiSettings';
import type { AgentConfig, AgentId } from '../../../../shared/aiSettings';

type AgentStateMap = Record<AgentId, AgentConfig>;
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type SaveStateMap = Partial<Record<AgentId, SaveStatus>>;

interface DefaultAgentCardDefinition {
	id: 'writer' | 'designer';
	agentId: AgentId;
	title: string;
	icon: LucideIcon;
	accentClassName: string;
}

interface AgentCardProps {
	definition: DefaultAgentCardDefinition;
	config: AgentConfig;
	saveStatus: SaveStatus;
	onConfigChange: (agentId: AgentId, config: AgentConfig) => void;
}

function buildInitialAgentState(): AgentStateMap {
	return Object.fromEntries(
		AGENT_IDS.map((id) => [id, { ...DEFAULT_AGENT_CONFIG }])
	) as AgentStateMap;
}

function normalizeAgentConfig(config: AgentConfig): AgentConfig {
	const provider =
		aiProviders.find((entry) => entry.id === config.providerId) ??
		aiProviders.find((entry) => entry.id === DEFAULT_AGENT_CONFIG.providerId) ??
		aiProviders[0];

	if (!provider) {
		return { ...DEFAULT_AGENT_CONFIG };
	}

	const modelExists = provider.models.some((model) => model.id === config.modelId);
	const modelId =
		(modelExists ? config.modelId : provider.models[0]?.id) ?? DEFAULT_AGENT_CONFIG.modelId;

	return {
		providerId: provider.id,
		modelId,
		temperature: config.temperature,
		reasoning: config.reasoning,
	};
}

function getSaveBadge(
	t: TFunction,
	status: SaveStatus
): { label: string; className: string; icon?: React.ReactNode } {
	switch (status) {
		case 'saving':
			return {
				label: t('agents.saving', 'Saving'),
				className: 'border-primary/20 bg-primary/10 text-primary',
				icon: <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />,
			};
		case 'saved':
			return {
				label: t('agents.saved', 'Saved'),
				className: 'border-primary/20 bg-primary/10 text-primary',
			};
		case 'error':
			return {
				label: t('agents.retry', 'Retry needed'),
				className: 'border-destructive/20 bg-destructive/10 text-destructive',
			};
		default:
			return {
				label: t('agents.ready', 'Ready'),
				className: 'border-border bg-muted/60 text-muted-foreground',
			};
	}
}

const AgentConfigCard = React.memo(function AgentConfigCard({
	definition,
	config,
	saveStatus,
	onConfigChange,
}: AgentCardProps) {
	const { t } = useTranslation();

	const saveBadge = getSaveBadge(t, saveStatus);
	const Icon = definition.icon;

	const handleProviderChange = useCallback(
		(value: string) => {
			const provider = aiProviders.find((entry) => entry.id === value);
			onConfigChange(
				definition.agentId,
				normalizeAgentConfig({
					...config,
					providerId: value,
					modelId: provider?.models[0]?.id ?? config.modelId,
				})
			);
		},
		[config, definition.agentId, onConfigChange]
	);

	return (
		<AppCard>
			<AppCardHeader className="space-y-4 border-b pb-4">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex items-start gap-4">
						<div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${definition.accentClassName}`}>
							<Icon className="h-5 w-5" aria-hidden="true" />
						</div>
						<div>
							<AppCardTitle className="text-base font-semibold">{definition.title}</AppCardTitle>
						</div>
					</div>

					<AppBadge
						variant="outline"
						className={`flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium ${saveBadge.className}`}
					>
						{saveBadge.icon}
						{saveBadge.label}
					</AppBadge>
				</div>
			</AppCardHeader>

			<AppCardContent className="space-y-5 pt-5">
				<div className="space-y-2">
					<AppLabel className="text-xs font-medium text-muted-foreground">
						{t('agents.provider', 'Provider')}
					</AppLabel>
					<AppSelect value={config.providerId} onValueChange={handleProviderChange}>
						<AppSelectTrigger className="h-9 text-sm">
							<AppSelectValue />
						</AppSelectTrigger>
						<AppSelectContent>
							<AppSelectGroup>
								<AppSelectLabel>{t('agents.provider', 'Provider')}</AppSelectLabel>
								{aiProviders.map((provider) => (
									<AppSelectItem key={provider.id} value={provider.id}>
										{provider.name}
									</AppSelectItem>
								))}
							</AppSelectGroup>
						</AppSelectContent>
					</AppSelect>
				</div>
			</AppCardContent>
		</AppCard>
	);
});

const AgentsPage: React.FC = () => {
	const { t } = useTranslation();
	const [agentStates, setAgentStates] = useState<AgentStateMap>(() => buildInitialAgentState());
	const [saveStates, setSaveStates] = useState<SaveStateMap>({});

	const defaultAgents = useMemo<DefaultAgentCardDefinition[]>(
		() => [
			{
				id: 'writer',
				agentId: 'text-writer',
				title: t('agents.writer.title', 'Writer'),
				icon: PenTool,
				accentClassName: 'bg-warning/12 text-warning',
			},
			{
				id: 'designer',
				agentId: 'image-generator',
				title: t('agents.designer.title', 'Designer'),
				icon: Palette,
				accentClassName: 'bg-primary/12 text-primary',
			},
		],
		[t]
	);

	useEffect(() => {
		let cancelled = false;

		window.workspace
			.getAgentSettings()
			.then((entries) => {
				if (cancelled) return;

				const nextState = buildInitialAgentState();
				for (const entry of entries) {
					const agentId = entry.agentId as AgentId;
					if ((AGENT_IDS as readonly string[]).includes(agentId)) {
						nextState[agentId] = normalizeAgentConfig(entry);
					}
				}

				setAgentStates(nextState);
			})
			.catch(() => {
				if (!cancelled) {
					setSaveStates({
						'text-writer': 'error',
						'image-generator': 'error',
					});
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const handleConfigChange = useCallback((agentId: AgentId, config: AgentConfig) => {
		const normalizedConfig = normalizeAgentConfig(config);

		setAgentStates((prev) => ({
			...prev,
			[agentId]: normalizedConfig,
		}));
		setSaveStates((prev) => ({
			...prev,
			[agentId]: 'saving',
		}));

		window.workspace.setAgentConfig(agentId, normalizedConfig).then(
			() => {
				setSaveStates((prev) => ({
					...prev,
					[agentId]: 'saved',
				}));
			},
			() => {
				setSaveStates((prev) => ({
					...prev,
					[agentId]: 'error',
				}));
			}
		);
	}, []);

	return (
		<div className="flex h-full flex-col">
			<div className="border-b px-6 py-3 shrink-0">
				<div className="flex items-center gap-2">
					<Bot className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
					<h1 className="text-lg font-semibold text-foreground">{t('agents.title', 'Agents')}</h1>
				</div>
			</div>

			<div className="flex-1 min-h-0 overflow-y-auto">
				<div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
					<p className="text-sm text-muted-foreground">
						{t(
							'agents.subtitle',
							'Select the provider used by each default agent in your workspace.'
						)}
					</p>

					<div className="grid gap-4 xl:grid-cols-2">
						{defaultAgents.map((agent) => (
							<AgentConfigCard
								key={agent.id}
								definition={agent}
								config={agentStates[agent.agentId]}
								saveStatus={saveStates[agent.agentId] ?? 'idle'}
								onConfigChange={handleConfigChange}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default AgentsPage;
