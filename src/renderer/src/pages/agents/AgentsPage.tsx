import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { PenTool, Palette, Sparkles, BrainCircuit, Loader2 } from 'lucide-react';
import { aiProviders } from '@/config/ai-providers';
import {
	AppBadge,
	AppCard,
	AppCardContent,
	AppCardDescription,
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
	AppSlider,
	AppSwitch,
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
	description: string;
	icon: LucideIcon;
	accentClassName: string;
	chips: string[];
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
				className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700',
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

	const availableModels = useMemo(
		() => aiProviders.find((provider) => provider.id === config.providerId)?.models ?? [],
		[config.providerId]
	);
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

	const handleModelChange = useCallback(
		(value: string) => {
			onConfigChange(definition.agentId, normalizeAgentConfig({ ...config, modelId: value }));
		},
		[config, definition.agentId, onConfigChange]
	);

	const handleTemperatureChange = useCallback(
		(value: number) => {
			onConfigChange(
				definition.agentId,
				normalizeAgentConfig({ ...config, temperature: Number(value.toFixed(1)) })
			);
		},
		[config, definition.agentId, onConfigChange]
	);

	const handleReasoningChange = useCallback(
		(checked: boolean) => {
			onConfigChange(definition.agentId, normalizeAgentConfig({ ...config, reasoning: checked }));
		},
		[config, definition.agentId, onConfigChange]
	);

	return (
		<AppCard className="overflow-hidden border-border/80 bg-card/95 shadow-sm">
			<AppCardHeader className="space-y-5 border-b border-border/70 pb-5">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex items-start gap-4">
						<div
							className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/40 shadow-sm ${definition.accentClassName}`}
						>
							<Icon className="h-5 w-5" aria-hidden="true" />
						</div>
						<div className="space-y-1">
							<AppCardTitle className="text-lg font-semibold">{definition.title}</AppCardTitle>
							<AppCardDescription className="max-w-xl text-sm leading-6">
								{definition.description}
							</AppCardDescription>
						</div>
					</div>

					<AppBadge
						variant="outline"
						className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${saveBadge.className}`}
					>
						{saveBadge.icon}
						{saveBadge.label}
					</AppBadge>
				</div>

				<div className="flex flex-wrap gap-2">
					{definition.chips.map((chip) => (
						<AppBadge
							key={chip}
							variant="secondary"
							className="rounded-full bg-muted/70 px-3 py-1 text-[11px] font-medium text-muted-foreground"
						>
							{chip}
						</AppBadge>
					))}
				</div>
			</AppCardHeader>

			<AppCardContent className="space-y-6 pt-6">
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<AppLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
							{t('agents.provider', 'Provider')}
						</AppLabel>
						<AppSelect value={config.providerId} onValueChange={handleProviderChange}>
							<AppSelectTrigger className="h-10 rounded-2xl border-border/80 bg-background/70 text-sm">
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

					<div className="space-y-2">
						<AppLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
							{t('agents.model', 'Model')}
						</AppLabel>
						<AppSelect value={config.modelId} onValueChange={handleModelChange}>
							<AppSelectTrigger className="h-10 rounded-2xl border-border/80 bg-background/70 text-sm">
								<AppSelectValue />
							</AppSelectTrigger>
							<AppSelectContent>
								<AppSelectGroup>
									<AppSelectLabel>{t('agents.model', 'Model')}</AppSelectLabel>
									{availableModels.map((model) => (
										<AppSelectItem key={model.id} value={model.id}>
											{model.name}
										</AppSelectItem>
									))}
								</AppSelectGroup>
							</AppSelectContent>
						</AppSelect>
					</div>
				</div>

				<div className="space-y-3">
					<div className="flex items-center justify-between gap-3">
						<div className="space-y-1">
							<p className="text-sm font-medium text-foreground">
								{t('agents.creativity', 'Creativity')}
							</p>
							<p className="text-xs text-muted-foreground">
								{t('agents.creativityDescription', 'Lower values stay precise, higher values explore more.')}
							</p>
						</div>
						<span className="rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground">
							{config.temperature.toFixed(1)}
						</span>
					</div>
					<AppSlider
						min={0}
						max={2}
						step={0.1}
						value={config.temperature}
						onValueChange={handleTemperatureChange}
						aria-label={t('agents.creativity', 'Creativity')}
						className="rounded-full"
					/>
				</div>

				<div className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
					<div className="space-y-1">
						<div className="flex items-center gap-2 text-sm font-medium text-foreground">
							<BrainCircuit className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
							{t('agents.reasoning', 'Reasoning mode')}
						</div>
						<p className="text-xs leading-5 text-muted-foreground">
							{t(
								'agents.reasoningDescription',
								'Enable deeper planning when the task benefits from extra thinking time.'
							)}
						</p>
					</div>
					<AppSwitch
						checked={config.reasoning}
						onCheckedChange={handleReasoningChange}
						aria-label={t('agents.reasoning', 'Reasoning mode')}
					/>
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
				description: t(
					'agents.writer.description',
					'Drafts clean prose, expands rough ideas, and keeps your writing flow moving.'
				),
				icon: PenTool,
				accentClassName: 'bg-amber-500/15 text-amber-700',
				chips: [
					t('agents.writer.chip1', 'Drafting'),
					t('agents.writer.chip2', 'Structure'),
					t('agents.writer.chip3', 'Rewrites'),
				],
			},
			{
				id: 'designer',
				agentId: 'image-generator',
				title: t('agents.designer.title', 'Designer'),
				description: t(
					'agents.designer.description',
					'Turns visual direction into image prompts, concepts, and polished creative outputs.'
				),
				icon: Palette,
				accentClassName: 'bg-sky-500/15 text-sky-700',
				chips: [
					t('agents.designer.chip1', 'Image prompts'),
					t('agents.designer.chip2', 'Moodboards'),
					t('agents.designer.chip3', 'Visual concepts'),
				],
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
		<div className="h-full overflow-y-auto">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6">
				<div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_320px]">
					<section className="rounded-[28px] border border-border/80 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_45%),linear-gradient(135deg,_hsl(var(--card))_0%,_hsl(var(--card))_100%)] p-6 shadow-sm">
						<div className="flex h-full flex-col justify-between gap-6">
							<div className="space-y-3">
								<div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
									<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
									{t('agents.overline', 'Default crew')}
								</div>
								<div className="space-y-2">
									<h1 className="text-3xl font-semibold tracking-tight text-foreground">
										{t('agents.title', 'Agents')}
									</h1>
									<p className="max-w-2xl text-sm leading-6 text-muted-foreground">
										{t(
											'agents.subtitle',
											'Configure the core agents that power writing and visual ideation across your workspace.'
										)}
									</p>
								</div>
							</div>

							<div className="flex flex-wrap gap-2">
								{defaultAgents.map((agent) => (
									<AppBadge
										key={agent.id}
										variant="outline"
										className="rounded-full border-border/80 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground"
									>
										{agent.title}
									</AppBadge>
								))}
							</div>
						</div>
					</section>

					<section className="rounded-[28px] border border-border/80 bg-card/95 p-6 shadow-sm">
						<div className="space-y-4">
							<div>
								<p className="text-sm font-semibold text-foreground">
									{t('agents.summaryTitle', 'Workspace defaults')}
								</p>
								<p className="mt-1 text-xs leading-5 text-muted-foreground">
									{t(
										'agents.summaryDescription',
										'These presets decide which provider and model each built-in agent uses by default.'
									)}
								</p>
							</div>

							<div className="space-y-3">
								{defaultAgents.map((agent) => (
									<div
										key={agent.id}
										className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/25 px-4 py-3"
									>
										<div className="min-w-0">
											<p className="text-sm font-medium text-foreground">{agent.title}</p>
											<p className="truncate text-xs text-muted-foreground">
												{agentStates[agent.agentId].providerId} / {agentStates[agent.agentId].modelId}
											</p>
										</div>
										<AppBadge
											variant="outline"
											className={`rounded-full px-2.5 py-1 text-[11px] ${
												getSaveBadge(t, saveStates[agent.agentId] ?? 'idle').className
											}`}
										>
											{getSaveBadge(t, saveStates[agent.agentId] ?? 'idle').label}
										</AppBadge>
									</div>
								))}
							</div>
						</div>
					</section>
				</div>

				<div className="grid gap-5 2xl:grid-cols-2">
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
	);
};

export default AgentsPage;
