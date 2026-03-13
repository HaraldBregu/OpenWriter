import React, { useEffect, useReducer, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { aiProviders, type AIProvider } from '@/config/ai-providers';

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

function buildInitialState(): ProviderStateMap {
	return Object.fromEntries(
		aiProviders.map((p) => [p.id, { ...INITIAL_PROVIDER_STATE }]),
	);
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

const SAVED_RESET_MS = 2000;

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

	const isSaving = status === 'saving';
	const isSaved = status === 'saved';
	const isError = status === 'error';

	return (
		<div className="flex items-center justify-between gap-4 px-4 py-3">
			<label
				htmlFor={`api-key-${provider.id}`}
				className="text-sm font-medium w-24 shrink-0"
			>
				{provider.name}
			</label>

			<div className="flex flex-1 items-center gap-2">
				<input
					id={`api-key-${provider.id}`}
					type="password"
					value={token}
					onChange={(e) => onTokenChange(provider.id, e.target.value)}
					placeholder={t('settings.models.apiKeyPlaceholder') || 'Enter API key…'}
					autoComplete="off"
					spellCheck={false}
					disabled={isSaving}
					className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
				/>

				<button
					type="button"
					onClick={() => onSave(provider.id)}
					disabled={isSaving || token.trim() === ''}
					className="shrink-0 rounded-md border border-transparent bg-foreground px-3 py-1.5 text-sm text-background transition-colors hover:opacity-80 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
				>
					{isSaving
						? (t('settings.models.saving') || 'Saving…')
						: (t('settings.models.save') || 'Save')}
				</button>
			</div>

			<span className="w-14 shrink-0 text-right text-xs">
				{isSaved && (
					<span className="text-green-600 dark:text-green-400">
						{t('settings.models.saved') || 'Saved!'}
					</span>
				)}
				{isError && (
					<span className="text-destructive">
						{t('settings.models.saveError') || 'Error'}
					</span>
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

	// Load all provider settings in a single IPC call on mount
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
		[providerStates],
	);

	return (
		<div className="mx-auto w-full p-6 space-y-8">
			<div>
				<h1 className="text-lg font-normal">{t('settings.models.title')}</h1>
				<p className="text-sm text-muted-foreground">{t('settings.models.description')}</p>
			</div>

			<section className="space-y-3">
				<h2 className="text-sm font-normal text-muted-foreground">
					{t('settings.models.apiKeysSection') || 'API Keys'}
				</h2>
				<div className="rounded-md border divide-y text-sm">
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
