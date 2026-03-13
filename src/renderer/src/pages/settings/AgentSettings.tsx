import React, { useEffect, useReducer, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { aiProviders } from '@/config/ai-providers';
import {
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
import {
	AGENT_DEFINITIONS,
	AGENT_IDS,
	DEFAULT_AGENT_CONFIG,
} from '../../../../shared/aiSettings';
import type { AgentConfig, AgentId } from '../../../../shared/aiSettings';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentStateMap = Record<AgentId, AgentConfig>;

type Action =
	| { type: 'INIT'; states: AgentStateMap }
	| { type: 'SET_CONFIG'; agentId: AgentId; config: AgentConfig };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function buildInitialState(): AgentStateMap {
	return Object.fromEntries(
		AGENT_IDS.map((id) => [id, { ...DEFAULT_AGENT_CONFIG }])
	) as AgentStateMap;
}

function reducer(state: AgentStateMap, action: Action): AgentStateMap {
	switch (action.type) {
		case 'INIT':
			return action.states;
		case 'SET_CONFIG':
			return {
				...state,
				[action.agentId]: action.config,
			};
		default:
			return state;
	}
}

// ---------------------------------------------------------------------------
// Sub-component: one card per agent
// ---------------------------------------------------------------------------

interface AgentConfigCardProps {
	agentId: AgentId;
	config: AgentConfig;
	onConfigChange: (agentId: AgentId, config: AgentConfig) => void;
}

const AgentConfigCard: React.FC<AgentConfigCardProps> = React.memo(
	({ agentId, config, onConfigChange }) => {
		const { t } = useTranslation();
		const definition = AGENT_DEFINITIONS[agentId];

		const availableModels = aiProviders.find((p) => p.id === config.providerId)?.models ?? [];

		const handleProviderChange = useCallback(
			(value: string) => {
				const provider = aiProviders.find((p) => p.id === value);
				const firstModelId = provider?.models[0]?.id ?? '';
				onConfigChange(agentId, { ...config, providerId: value, modelId: firstModelId });
			},
			[agentId, config, onConfigChange]
		);

		const handleModelChange = useCallback(
			(value: string) => {
				onConfigChange(agentId, { ...config, modelId: value });
			},
			[agentId, config, onConfigChange]
		);

		const handleTemperatureChange = useCallback(
			(value: number) => {
				onConfigChange(agentId, { ...config, temperature: value });
			},
			[agentId, config, onConfigChange]
		);

		const handleReasoningChange = useCallback(
			(checked: boolean) => {
				onConfigChange(agentId, { ...config, reasoning: checked });
			},
			[agentId, config, onConfigChange]
		);

		const providerSelectId = `agent-provider-${agentId}`;
		const modelSelectId = `agent-model-${agentId}`;
		const temperatureSliderId = `agent-temperature-${agentId}`;
		const reasoningSwitchId = `agent-reasoning-${agentId}`;

		return (
			<div className="rounded-md border p-4 space-y-4">
				<div>
					<h3 className="text-sm font-medium">{definition.name}</h3>
					<p className="text-xs text-muted-foreground mt-0.5">{definition.description}</p>
				</div>

				<div className="grid grid-cols-2 gap-4">
					{/* Provider select */}
					<div className="space-y-1.5">
						<AppLabel htmlFor={providerSelectId} className="text-xs text-muted-foreground">
							{t('settings.agents.provider')}
						</AppLabel>
						<AppSelect value={config.providerId} onValueChange={handleProviderChange}>
							<AppSelectTrigger id={providerSelectId} className="h-8 text-sm">
								<AppSelectValue />
							</AppSelectTrigger>
							<AppSelectContent>
								<AppSelectGroup>
									<AppSelectLabel>{t('settings.agents.provider')}</AppSelectLabel>
									{aiProviders.map((provider) => (
										<AppSelectItem key={provider.id} value={provider.id}>
											{provider.name}
										</AppSelectItem>
									))}
								</AppSelectGroup>
							</AppSelectContent>
						</AppSelect>
					</div>

					{/* Model select */}
					<div className="space-y-1.5">
						<AppLabel htmlFor={modelSelectId} className="text-xs text-muted-foreground">
							{t('settings.agents.model')}
						</AppLabel>
						<AppSelect value={config.modelId} onValueChange={handleModelChange}>
							<AppSelectTrigger id={modelSelectId} className="h-8 text-sm">
								<AppSelectValue />
							</AppSelectTrigger>
							<AppSelectContent>
								<AppSelectGroup>
									<AppSelectLabel>{t('settings.agents.model')}</AppSelectLabel>
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

				{/* Temperature slider */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<AppLabel htmlFor={temperatureSliderId} className="text-xs text-muted-foreground">
							{t('settings.agents.temperature')}
						</AppLabel>
						<span className="text-xs tabular-nums text-muted-foreground">
							{config.temperature.toFixed(1)}
						</span>
					</div>
					<AppSlider
						id={temperatureSliderId}
						min={0}
						max={2}
						step={0.1}
						value={config.temperature}
						onValueChange={handleTemperatureChange}
						aria-label={t('settings.agents.temperature')}
					/>
				</div>

				{/* Thinking mode switch */}
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<AppLabel htmlFor={reasoningSwitchId} className="text-sm cursor-pointer">
							{t('settings.agents.thinkingMode')}
						</AppLabel>
						<p className="text-xs text-muted-foreground">
							{t('settings.agents.thinkingModeDescription')}
						</p>
					</div>
					<AppSwitch
						id={reasoningSwitchId}
						checked={config.reasoning}
						onCheckedChange={handleReasoningChange}
						aria-label={t('settings.agents.thinkingMode')}
					/>
				</div>
			</div>
		);
	}
);
AgentConfigCard.displayName = 'AgentConfigCard';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AgentSettings: React.FC = () => {
	const { t } = useTranslation();
	const [agentStates, dispatch] = useReducer(reducer, undefined, buildInitialState);

	useEffect(() => {
		window.app.getAgentSettings().then((all) => {
			const loaded = buildInitialState();
			for (const id of AGENT_IDS) {
				const persisted = all[id];
				if (persisted) {
					loaded[id] = persisted;
				}
			}
			dispatch({ type: 'INIT', states: loaded });
		});
	}, []);

	const handleConfigChange = useCallback((agentId: AgentId, config: AgentConfig) => {
		dispatch({ type: 'SET_CONFIG', agentId, config });
		window.app.setAgentConfig(agentId, config).catch(() => {
			// Silently ignore persistence failure; UI state is still updated.
		});
	}, []);

	return (
		<div className="mx-auto w-full space-y-8 p-6">
			<div>
				<h1 className="text-lg font-normal">{t('settings.agents.title')}</h1>
				<p className="text-sm text-muted-foreground">{t('settings.agents.description')}</p>
			</div>

			<section className="space-y-4">
				{AGENT_IDS.map((agentId) => (
					<AgentConfigCard
						key={agentId}
						agentId={agentId}
						config={agentStates[agentId]}
						onConfigChange={handleConfigChange}
					/>
				))}
			</section>
		</div>
	);
};

export default AgentSettings;
