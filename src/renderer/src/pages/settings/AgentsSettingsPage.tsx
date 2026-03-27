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
} from '@/components/app';
import { AGENT_DEFINITIONS, AGENT_IDS, DEFAULT_AGENT_CONFIG } from '../../../../shared/aiSettings';
import type { AgentConfig, AgentId } from '../../../../shared/aiSettings';

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

type AgentStateMap = Record<AgentId, AgentConfig>;

type AgentAction =
	| { type: 'INIT'; states: AgentStateMap }
	| { type: 'SET_CONFIG'; agentId: AgentId; config: AgentConfig };

function buildInitialAgentState(): AgentStateMap {
	return Object.fromEntries(
		AGENT_IDS.map((id) => [id, { ...DEFAULT_AGENT_CONFIG }])
	) as AgentStateMap;
}

function agentReducer(state: AgentStateMap, action: AgentAction): AgentStateMap {
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
// Section header — small muted text used as a visual divider
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
	readonly title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
	<div className="pt-6 pb-2 first:pt-0">
		<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h2>
	</div>
);

// ---------------------------------------------------------------------------
// AgentConfigCard
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

		const handleProviderChange = useCallback(
			(value: string) => {
				onConfigChange(agentId, { ...config, providerId: value });
			},
			[agentId, config, onConfigChange]
		);

		const providerSelectId = `agent-provider-${agentId}`;

		return (
			<div className="space-y-4">
				<div>
					<h3 className="text-base font-medium">{definition.name}</h3>
					<p className="text-xs text-muted-foreground mt-0.5">{definition.description}</p>
				</div>

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
			</div>
		);
	}
);
AgentConfigCard.displayName = 'AgentConfigCard';

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const AgentsSettingsPage: React.FC = () => {
	const { t } = useTranslation();

	const [agentStates, agentDispatch] = useReducer(agentReducer, undefined, buildInitialAgentState);

	useEffect(() => {
		window.workspace.getAgentSettings().then((entries) => {
			const loaded = buildInitialAgentState();
			for (const entry of entries) {
				const { agentId, ...config } = entry;
				if (AGENT_IDS.includes(agentId as AgentId)) {
					loaded[agentId as AgentId] = config;
				}
			}
			agentDispatch({ type: 'INIT', states: loaded });
		});
	}, []);

	const handleConfigChange = useCallback((agentId: AgentId, config: AgentConfig) => {
		agentDispatch({ type: 'SET_CONFIG', agentId, config });
		window.workspace.setAgentConfig(agentId, config).catch(() => {
			// Silently ignore persistence failure; UI state is still updated.
		});
	}, []);

	return (
		<div className="w-full max-w-2xl p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.agents.title')}</h1>

			{AGENT_IDS.map((agentId) => (
				<React.Fragment key={agentId}>
					<SectionHeader title={AGENT_DEFINITIONS[agentId].name} />
					<AgentConfigCard
						agentId={agentId}
						config={agentStates[agentId]}
						onConfigChange={handleConfigChange}
					/>
				</React.Fragment>
			))}
		</div>
	);
};

export default AgentsSettingsPage;
