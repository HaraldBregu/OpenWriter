import React, { useEffect, useReducer, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { aiProviders, type AIProvider } from '@/config/ai-providers';
import { AppButton, AppInput, AppLabel } from '@/components/app';
import { SectionHeader } from './SettingsComponents';

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
		<div className="flex items-center gap-4 py-2">
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
// Main page
// ===========================================================================

const ModelsSettingsPage: React.FC = () => {
	const { t } = useTranslation();

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

	return (
		<div className="w-full max-w-2xl p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.models.title')}</h1>

			{/* ── API Keys ────────────────────────────────────────────────── */}
			<SectionHeader title={t('settings.models.apiKeysSection') || 'API Keys'} />

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
	);
};

export default ModelsSettingsPage;
