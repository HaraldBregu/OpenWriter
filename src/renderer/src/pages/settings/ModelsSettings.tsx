import React, { useEffect, useReducer, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { aiProviders, type AIProvider } from '@/config/ai-providers';
import { AppButton, AppInput, AppLabel } from '@/components/app';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ProviderState {
	token: string;
	status: SaveStatus;
}

type ProviderStateMap = Record<string, ProviderState>;

type Action =
	| { type: 'SET_TOKEN'; providerId: string; token: string }
	| { type: 'SET_STATUS'; providerId: string; status: SaveStatus }
	| { type: 'INIT'; states: ProviderStateMap };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const INITIAL_PROVIDER_STATE: ProviderState = { token: '', status: 'idle' };
const SAVED_RESET_MS = 2000;

function buildInitialState(): ProviderStateMap {
	return Object.fromEntries(aiProviders.map((p) => [p.id, { ...INITIAL_PROVIDER_STATE }]));
}

function reducer(state: ProviderStateMap, action: Action): ProviderStateMap {
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
// Sub-component: one row per provider
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
		<div className="flex items-center gap-4 px-4 py-3">
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
					{isVisible ? <EyeOffIcon /> : <EyeIcon />}
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ModelsSettings: React.FC = () => {
	const { t } = useTranslation();
	const [providerStates, dispatch] = useReducer(reducer, undefined, buildInitialState);

	useEffect(() => {
		window.app.getAllProviderSettings().then((all) => {
			const loaded: ProviderStateMap = buildInitialState();
			for (const provider of aiProviders) {
				const settings = all[provider.id];
				if (settings) {
					loaded[provider.id] = { token: settings.apiToken ?? '', status: 'idle' };
				}
			}
			dispatch({ type: 'INIT', states: loaded });
		});
	}, []);

	const handleTokenChange = useCallback((providerId: string, token: string) => {
		dispatch({ type: 'SET_TOKEN', providerId, token });
	}, []);

	const handleSave = useCallback(
		(providerId: string) => {
			const current = providerStates[providerId];
			if (!current || current.token.trim() === '') return;

			dispatch({ type: 'SET_STATUS', providerId, status: 'saving' });

			window.app
				.setApiToken(providerId, current.token.trim())
				.then(() => {
					dispatch({ type: 'SET_STATUS', providerId, status: 'saved' });
					setTimeout(() => {
						dispatch({ type: 'SET_STATUS', providerId, status: 'idle' });
					}, SAVED_RESET_MS);
				})
				.catch(() => {
					dispatch({ type: 'SET_STATUS', providerId, status: 'error' });
				});
		},
		[providerStates]
	);

	return (
		<div className="mx-auto w-full space-y-8 p-6">
			<div>
				<h1 className="text-lg font-normal">{t('settings.models.title')}</h1>
				<p className="text-sm text-muted-foreground">{t('settings.models.description')}</p>
			</div>

			<section className="space-y-3">
				<h2 className="text-sm font-normal text-muted-foreground">
					{t('settings.models.apiKeysSection') || 'API Keys'}
				</h2>
				<div className="divide-y rounded-md border text-sm">
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
		</div>
	);
};

export default ModelsSettings;
