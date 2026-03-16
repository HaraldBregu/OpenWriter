import React, { useEffect, useReducer, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { aiProviders, type AIProvider } from '@/config/ai-providers';
import {
	AppButton,
	AppInput,
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
import { AGENT_DEFINITIONS, AGENT_IDS, DEFAULT_AGENT_CONFIG } from '../../../../shared/aiSettings';
import type { AgentConfig, AgentId } from '../../../../shared/aiSettings';

// ===========================================================================
// API Keys section
// ===========================================================================

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ProviderState {
	token: string;
	status: SaveStatus;
}

type ProviderStateMap = Record<string, ProviderState>;

type ApiKeyAction =
	| { type: 'SET_TOKEN'; providerId: string; token: string }
	| { type: 'SET_STATUS'; providerId: string; status: SaveStatus }
	| { type: 'INIT'; states: ProviderStateMap };

const INITIAL_PROVIDER_STATE: ProviderState = { token: '', status: 'idle' };
const SAVED_RESET_MS = 2000;

function buildInitialApiKeyState(): ProviderStateMap {
	return Object.fromEntries(aiProviders.map((p) => [p.id, { ...INITIAL_PROVIDER_STATE }]));
}

function apiKeyReducer(state: ProviderStateMap, action: ApiKeyAction): ProviderStateMap {
	switch (action.type) {
		case 'INIT':
			return action.states;
		case 'SET_TOKEN':
			return {
				...state,
				[action.providerId]: { ...state[action.providerId], token: action.token },
			};
		case 'SET_STATUS':
			return {
				...state,
				[action.providerId]: { ...state[action.providerId], status: action.status },
			};
		default:
			return state;
	}
}

// ---------------------------------------------------------------------------
// ProviderApiKeyRow
// ---------------------------------------------------------------------------

interface ProviderApiKeyRowProps {
	provider: AIProvider;
	token: string;
	status: SaveStatus;
	onTokenChange: (providerId: string, token: string) => void;
	onSave: (providerId: string) => void;
}

const ProviderApiKeyRow: React.FC<ProviderApiKeyRowProps> = ({
	provider,
	token,
	status,
	onTokenChange,
	onSave,
}) => {
	const { t } = useTranslation();
	const [isVisible, setIsVisible] = useState(false);

	const isSaving = status === 'saving';
	const isSaved = status === 'saved';
	const isError = status === 'error';

	const inputId = `api-key-${provider.id}`;
	const toggleVisibilityLabel = isVisible
		? t('settings.models.hideApiKey') || 'Hide API key'
		: t('settings.models.showApiKey') || 'Show API key';

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				onSave(provider.id);
			}
		},
		[onSave, provider.id]
	);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onTokenChange(provider.id, e.target.value);
		},
		[onTokenChange, provider.id]
	);

	const handleToggleVisibility = useCallback(() => {
		setIsVisible((prev) => !prev);
	}, []);

	const handleSave = useCallback(() => {
		onSave(provider.id);
	}, [onSave, provider.id]);

	return (
		<div className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
			<AppLabel htmlFor={inputId} className="w-24 shrink-0 text-sm font-medium">
				{provider.name}
			</AppLabel>

			<div className="relative flex flex-1 items-center">
				<AppInput
					id={inputId}
					type={isVisible ? 'text' : 'password'}
					value={token}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					placeholder={t('settings.models.apiKeyPlaceholder') || 'Enter API key…'}
					autoComplete="off"
					spellCheck={false}
					disabled={isSaving}
					className="flex-1 font-mono pr-8 text-sm"
				/>
				<AppButton
					type="button"
					variant="ghost"
					size="icon-xs"
					aria-label={toggleVisibilityLabel}
					onClick={handleToggleVisibility}
					className="absolute right-1.5 text-muted-foreground hover:text-foreground"
				>
					{isVisible ? <EyeOff /> : <Eye />}
				</AppButton>
			</div>

			<AppButton
				type="button"
				variant="default"
				size="sm"
				onClick={handleSave}
				disabled={isSaving || token.trim() === ''}
				className="shrink-0"
			>
				{isSaving ? t('settings.models.saving') || 'Saving…' : t('settings.models.save') || 'Save'}
			</AppButton>

			<span role="status" aria-live="polite" className="w-14 shrink-0 text-right text-xs">
				{isSaved && (
					<span className="text-green-600 dark:text-green-400">
						{t('settings.models.saved') || 'Saved!'}
					</span>
				)}
				{isError && (
					<span className="text-destructive">{t('settings.models.saveError') || 'Error'}</span>
				)}
			</span>
		</div>
	);
};

// ===========================================================================
// Agents section
// ===========================================================================

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
			<div className="space-y-4">
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

// ===========================================================================
// Combined page
// ===========================================================================

const ModelsSettingsPage: React.FC = () => {
	const { t } = useTranslation();

	// --- API keys state ---
	const [providerStates, apiKeyDispatch] = useReducer(
		apiKeyReducer,
		undefined,
		buildInitialApiKeyState
	);

	useEffect(() => {
		window.app.getAllApiKeys().then((all) => {
			const loaded: ProviderStateMap = buildInitialApiKeyState();
			for (const provider of aiProviders) {
				const apiKey = all[provider.id];
				if (apiKey) {
					loaded[provider.id] = { token: apiKey, status: 'idle' };
				}
			}
			apiKeyDispatch({ type: 'INIT', states: loaded });
		});
	}, []);

	const handleTokenChange = useCallback((providerId: string, token: string) => {
		apiKeyDispatch({ type: 'SET_TOKEN', providerId, token });
	}, []);

	const handleSave = useCallback(
		(providerId: string) => {
			const current = providerStates[providerId];
			if (!current || current.token.trim() === '') return;

			apiKeyDispatch({ type: 'SET_STATUS', providerId, status: 'saving' });

			window.app
				.setApiKey(providerId, current.token.trim())
				.then(() => {
					apiKeyDispatch({ type: 'SET_STATUS', providerId, status: 'saved' });
					setTimeout(() => {
						apiKeyDispatch({ type: 'SET_STATUS', providerId, status: 'idle' });
					}, SAVED_RESET_MS);
				})
				.catch(() => {
					apiKeyDispatch({ type: 'SET_STATUS', providerId, status: 'error' });
				});
		},
		[providerStates]
	);

	// --- Agents state ---
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
		<div className="mx-auto w-full space-y-8 p-6">
			<div>
				<h1 className="text-lg font-normal">{t('settings.models.title')}</h1>
				<p className="text-sm text-muted-foreground">{t('settings.models.description')}</p>
			</div>

			{/* API Keys section */}
			<section className="space-y-3">
				<h2 className="text-sm font-normal text-muted-foreground">
					{t('settings.models.apiKeysSection') || 'API Keys'}
				</h2>
				<div className="divide-y rounded-md border bg-card text-sm">
					{aiProviders.map((provider) => {
						const state = providerStates[provider.id] ?? INITIAL_PROVIDER_STATE;
						return (
							<ProviderApiKeyRow
								key={provider.id}
								provider={provider}
								token={state.token}
								status={state.status}
								onTokenChange={handleTokenChange}
								onSave={handleSave}
							/>
						);
					})}
				</div>
			</section>

			{/* Agents section */}
			<section className="space-y-3">
				<h2 className="text-sm font-normal text-muted-foreground">
					{t('settings.agents.title') || 'Agents'}
				</h2>
				<div className="space-y-6">
					{AGENT_IDS.map((agentId) => (
						<AgentConfigCard
							key={agentId}
							agentId={agentId}
							config={agentStates[agentId]}
							onConfigChange={handleConfigChange}
						/>
					))}
				</div>
			</section>
		</div>
	);
};

export default ModelsSettingsPage;
