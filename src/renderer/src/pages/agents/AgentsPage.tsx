import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, ImageIcon, PenTool, Sparkles, WandSparkles } from 'lucide-react';
import { aiProviders } from '@/config/ai-providers';
import {
	AppCard,
	AppCardContent,
	AppLabel,
	AppSelect,
	AppSelectContent,
	AppSelectGroup,
	AppSelectItem,
	AppSelectLabel,
	AppSelectTrigger,
	AppSelectValue,
	AppTable,
	AppTableBody,
	AppTableCell,
	AppTableHead,
	AppTableHeader,
	AppTableRow,
} from '@/components/app';
import { AGENT_DEFINITIONS, AGENT_IDS } from '../../../../shared/ai-settings';
import type { AgentConfig, AgentId } from '../../../../shared/ai-settings';

type AgentStateMap = Record<AgentId, AgentConfig>;

interface AgentTableRowDefinition {
	agentId: AgentId;
	title: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	accentClassName: string;
}

interface AgentRowProps {
	definition: AgentTableRowDefinition;
	config: AgentConfig;
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

	return {
		name: config.name,
		providerId: provider.id,
	};
}

function getAgentIcon(agentId: AgentId) {
	switch (agentId) {
		case 'text-completer':
			return {
				icon: Sparkles,
				accentClassName: 'bg-muted text-muted-foreground',
			};
		case 'text-enhance':
			return {
				icon: WandSparkles,
				accentClassName: 'bg-warning/12 text-warning',
			};
		case 'text-writer':
			return {
				icon: PenTool,
				accentClassName: 'bg-primary/12 text-primary',
			};
		case 'image-generator':
			return {
				icon: ImageIcon,
				accentClassName: 'bg-primary/12 text-primary',
			};
	}

	return {
		icon: Bot,
		accentClassName: 'bg-muted text-muted-foreground',
	};
}

const AgentTableRow = React.memo(function AgentTableRow({
	definition,
	config,
	onConfigChange,
}: AgentRowProps) {
	const { t } = useTranslation();
	const Icon = definition.icon;

	const handleProviderChange = useCallback(
		(value: string) => {
			onConfigChange(definition.agentId, normalizeAgentConfig({ ...config, providerId: value }));
		},
		[config, definition.agentId, onConfigChange]
	);

	return (
		<AppTableRow>
			<AppTableCell className="w-[70%]">
				<div className="flex items-center gap-3">
					<div
						className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${definition.accentClassName}`}
					>
						<Icon className="h-4 w-4" aria-hidden="true" />
					</div>
					<span className="text-sm font-medium text-foreground">{definition.title}</span>
				</div>
			</AppTableCell>
			<AppTableCell className="w-[30%]">
				<div className="max-w-[220px] space-y-1">
					<AppLabel className="sr-only">{t('agents.provider', 'Provider')}</AppLabel>
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
			</AppTableCell>
		</AppTableRow>
	);
});

const AgentsPage: React.FC = () => {
	const { t } = useTranslation();
	const [agentStates, setAgentStates] = useState<AgentStateMap>(() => buildInitialAgentState());

	const agentRows = useMemo<AgentTableRowDefinition[]>(
		() =>
			AGENT_IDS.map((agentId) => {
				const { icon, accentClassName } = getAgentIcon(agentId);
				return {
					agentId,
					title: AGENT_DEFINITIONS[agentId].name,
					icon,
					accentClassName,
				};
			}),
		[]
	);

	const handleConfigChange = useCallback((agentId: AgentId, config: AgentConfig) => {
		const normalizedConfig = normalizeAgentConfig(config);

		setAgentStates((prev) => ({
			...prev,
			[agentId]: normalizedConfig,
		}));
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
						{t('agents.subtitle', 'Select the provider used by each available agent.')}
					</p>

					<AppCard>
						<AppCardContent className="p-0">
							<AppTable>
								<AppTableHeader>
									<AppTableRow>
										<AppTableHead className="w-[70%]">{t('agents.agent', 'Agent')}</AppTableHead>
										<AppTableHead className="w-[30%]">
											{t('agents.provider', 'Provider')}
										</AppTableHead>
									</AppTableRow>
								</AppTableHeader>
								<AppTableBody>
									{agentRows.map((agent) => (
										<AgentTableRow
											key={agent.agentId}
											definition={agent}
											config={agentStates[agent.agentId]}
											onConfigChange={handleConfigChange}
										/>
									))}
								</AppTableBody>
							</AppTable>
						</AppCardContent>
					</AppCard>
				</div>
			</div>
		</div>
	);
};

export default AgentsPage;
