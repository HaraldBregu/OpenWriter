import React, { useState, useCallback, useId, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, Eye, EyeOff, Trash2 } from 'lucide-react';
import { type CreateModelInput, type ModelConfig } from '../../../../shared/model-defaults';
import { PROVIDER_CATALOGUE } from '../../../../shared/model-constants';
import {
	AppButton,
	AppInput,
	AppLabel,
	AppBadge,
	AppSeparator,
} from '../../components/app';

const DEFAULT_PROVIDERS = ['anthropic', 'openai', 'google', 'mistral'] as const;
type DefaultProvider = (typeof DEFAULT_PROVIDERS)[number];

const PROVIDER_LABELS: Record<DefaultProvider, string> = DEFAULT_PROVIDERS.reduce(
	(acc, providerId) => {
		const label = PROVIDER_CATALOGUE.find((provider) => provider.id === providerId)?.name ?? providerId;
		acc[providerId] = label;
		return acc;
	},
	{} as Record<DefaultProvider, string>
);

interface FormState {
	provider: string;
	apikey: string;
	baseurl: string;
}

const EMPTY_FORM: FormState = {
	provider: '',
	apikey: '',
	baseurl: '',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskApiKey(key: string): string {
	if (key.length === 0) return '—';
	if (key.length <= 4) return '••••';
	return `${key.slice(0, 3)}${'•'.repeat(8)}${key.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

const ModelsEmptyState: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col items-center justify-center gap-4 text-center px-6 py-12">
			<div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
				<Cpu className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
			</div>
			<div className="space-y-1 max-w-xs">
				<p className="text-sm font-medium text-foreground">
					{t('models.emptyTitle', 'No models registered')}
				</p>
				<p className="text-xs text-muted-foreground">
					{t('models.emptyDescription', 'Register a model to make it available in your workspace.')}
				</p>
			</div>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Model row
// ---------------------------------------------------------------------------

interface ModelRowProps {
	entry: ModelConfig;
	onDelete: (id: string) => void;
}

const ModelRow: React.FC<ModelRowProps> = ({ entry, onDelete }) => {
	const { t } = useTranslation();

	const handleDelete = useCallback(() => {
		onDelete(entry.id);
	}, [onDelete, entry.id]);

	return (
		<div className="flex items-center gap-3 py-2.5 px-1">
			<AppBadge variant="secondary" className="shrink-0 text-xs font-medium">
				{entry.provider}
			</AppBadge>
			{entry.apikey.length > 0 && (
				<span className="font-mono text-xs text-muted-foreground shrink-0">
					{maskApiKey(entry.apikey)}
				</span>
			)}
			{entry.baseurl.length > 0 && (
				<span
					className="text-xs text-muted-foreground truncate max-w-[140px]"
					title={entry.baseurl}
				>
					{entry.baseurl}
				</span>
			)}
			<AppButton
				type="button"
				variant="ghost"
				size="icon-xs"
				aria-label={t('models.deleteModel', 'Delete model')}
				onClick={handleDelete}
				className="shrink-0 text-muted-foreground hover:text-destructive"
			>
				<Trash2 />
			</AppButton>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Registration form
// ---------------------------------------------------------------------------

interface RegistrationFormProps {
	providerSuggestions: string[];
	onRegister: (entry: CreateModelInput) => void;
	onProviderAdded: (provider: string) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({
	providerSuggestions,
	onRegister,
	onProviderAdded,
}) => {
	const { t } = useTranslation();
	const uid = useId();
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [apiKeyVisible, setApiKeyVisible] = useState(false);
	const isValid = form.provider.trim().length > 0;

	const handleProviderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setForm((prev) => ({ ...prev, provider: e.target.value }));
	}, []);

	const handleApiKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setForm((prev) => ({ ...prev, apikey: e.target.value }));
	}, []);

	const handleBaseUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setForm((prev) => ({ ...prev, baseurl: e.target.value }));
	}, []);

	const handleToggleApiKeyVisibility = useCallback(() => {
		setApiKeyVisible((prev) => !prev);
	}, []);

	const handleSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (!isValid) return;
			const provider = form.provider.trim();
			onRegister({
				provider,
				apikey: form.apikey,
				baseurl: form.baseurl.trim(),
			});
			onProviderAdded(provider);
			setForm(EMPTY_FORM);
			setApiKeyVisible(false);
		},
		[isValid, form, onProviderAdded, onRegister]
	);

	const toggleVisibilityLabel = apiKeyVisible
		? t('models.hideApiKey', 'Hide API key')
		: t('models.showApiKey', 'Show API key');

	return (
		<form onSubmit={handleSubmit} noValidate>
			<div className="grid grid-cols-2 gap-x-4 gap-y-3">
				<div className="flex flex-col gap-1.5">
					<AppLabel htmlFor={`${uid}-provider`} className="text-xs font-medium">
						{t('models.form.provider', 'Provider')}
					</AppLabel>
					<AppInput
						id={`${uid}-provider`}
						list={`${uid}-provider-options`}
						type="text"
						value={form.provider}
						onChange={handleProviderChange}
						placeholder={t('models.form.selectProvider', 'Select provider…')}
						autoComplete="off"
						spellCheck={false}
						className="h-9 text-sm"
					/>
					<datalist id={`${uid}-provider-options`}>
						{providerSuggestions.map((provider) => (
							<option key={provider} value={provider} />
						))}
					</datalist>
				</div>

				<div className="flex flex-col gap-1.5">
					<AppLabel htmlFor={`${uid}-apikey`} className="text-xs font-medium">
						{t('models.form.apiKey', 'API Key')}
					</AppLabel>
					<div className="relative flex items-center">
						<AppInput
							id={`${uid}-apikey`}
							type={apiKeyVisible ? 'text' : 'password'}
							value={form.apikey}
							onChange={handleApiKeyChange}
							placeholder={t('models.form.apiKeyPlaceholder', 'Enter API key…')}
							autoComplete="off"
							spellCheck={false}
							className="h-9 text-sm font-mono pr-8"
						/>
						<AppButton
							type="button"
							variant="ghost"
							size="icon-xs"
							aria-label={toggleVisibilityLabel}
							onClick={handleToggleApiKeyVisibility}
							className="absolute right-1.5 text-muted-foreground hover:text-foreground"
						>
							{apiKeyVisible ? <EyeOff /> : <Eye />}
						</AppButton>
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<AppLabel htmlFor={`${uid}-baseurl`} className="text-xs font-medium">
						{t('models.form.baseUrl', 'Base URL')}
					</AppLabel>
					<AppInput
						id={`${uid}-baseurl`}
						type="url"
						value={form.baseurl}
						onChange={handleBaseUrlChange}
						placeholder={t('models.form.baseUrlPlaceholder', 'https://api.openai.com/v1')}
						autoComplete="off"
						spellCheck={false}
						className="h-9 text-sm"
					/>
				</div>
			</div>

			<div className="flex justify-end mt-4">
				<AppButton type="submit" size="sm" disabled={!isValid}>
					{t('models.form.save', 'Save')}
				</AppButton>
			</div>
		</form>
	);
};

// ---------------------------------------------------------------------------
// Default providers
// ---------------------------------------------------------------------------

interface DefaultProvidersSectionProps {
	models: ModelConfig[];
	onSaveProviderApiKey: (provider: DefaultProvider, apiKey: string) => Promise<void>;
}

const DefaultProvidersSection: React.FC<DefaultProvidersSectionProps> = ({
	models,
	onSaveProviderApiKey,
}) => {
	const { t } = useTranslation();
	const uid = useId();
	const [apiKeys, setApiKeys] = useState<Record<DefaultProvider, string>>({
		anthropic: '',
		openai: '',
		google: '',
		mistral: '',
	});
	const [visible, setVisible] = useState<Record<DefaultProvider, boolean>>({
		anthropic: false,
		openai: false,
		google: false,
		mistral: false,
	});
	const [saving, setSaving] = useState<Record<DefaultProvider, boolean>>({
		anthropic: false,
		openai: false,
		google: false,
		mistral: false,
	});

	const handleApiKeyChange = useCallback((provider: DefaultProvider, value: string) => {
		setApiKeys((prev) => ({ ...prev, [provider]: value }));
	}, []);

	const handleToggleVisibility = useCallback((provider: DefaultProvider) => {
		setVisible((prev) => ({ ...prev, [provider]: !prev[provider] }));
	}, []);

	const handleSaveProvider = useCallback(
		async (provider: DefaultProvider) => {
			const apiKey = apiKeys[provider].trim();
			if (apiKey.length === 0 || saving[provider]) return;

			setSaving((prev) => ({ ...prev, [provider]: true }));
			try {
				await onSaveProviderApiKey(provider, apiKey);
				setApiKeys((prev) => ({ ...prev, [provider]: '' }));
			} catch {
				// Save failed — keep current input so the user can retry
			} finally {
				setSaving((prev) => ({ ...prev, [provider]: false }));
			}
		},
		[apiKeys, onSaveProviderApiKey, saving]
	);

	return (
		<section className="px-6 py-5">
			<div className="mb-4">
				<h2 className="text-sm font-semibold text-foreground">
					{t('models.defaultProviders.title', 'Default Providers')}
				</h2>
				<p className="text-xs text-muted-foreground mt-0.5">
					{t(
						'models.defaultProviders.subtitle',
						'Configure API keys for the most important providers.'
					)}
				</p>
			</div>

			<div className="space-y-3">
				{DEFAULT_PROVIDERS.map((provider) => {
					const existing = models.find((m) => m.provider === provider)?.apikey ?? '';
					const hasInputValue = apiKeys[provider].trim().length > 0;
					const isSaving = saving[provider];
					const visibilityLabel = visible[provider]
						? t('models.hideApiKey', 'Hide API key')
						: t('models.showApiKey', 'Show API key');

					return (
						<div key={provider} className="grid grid-cols-[120px_1fr_auto] gap-3 items-end">
							<div className="flex flex-col gap-1.5">
								<AppLabel htmlFor={`${uid}-${provider}-apikey`} className="text-xs font-medium">
									{PROVIDER_LABELS[provider]}
								</AppLabel>
							</div>
							<div className="relative flex items-center">
								<AppInput
									id={`${uid}-${provider}-apikey`}
									type={visible[provider] ? 'text' : 'password'}
									value={apiKeys[provider]}
									onChange={(e) => handleApiKeyChange(provider, e.target.value)}
									placeholder={
										existing.length > 0
											? t('models.defaultProviders.updatePlaceholder', 'Update API key…')
											: t('models.form.apiKeyPlaceholder', 'Enter API key…')
									}
									autoComplete="off"
									spellCheck={false}
									className="h-9 text-sm font-mono pr-8"
								/>
								<AppButton
									type="button"
									variant="ghost"
									size="icon-xs"
									aria-label={visibilityLabel}
									onClick={() => handleToggleVisibility(provider)}
									className="absolute right-1.5 text-muted-foreground hover:text-foreground"
								>
									{visible[provider] ? <EyeOff /> : <Eye />}
								</AppButton>
							</div>
							<AppButton
								type="button"
								size="sm"
								disabled={!hasInputValue || isSaving}
								onClick={() => {
									void handleSaveProvider(provider);
								}}
							>
								{isSaving ? t('models.saving', 'Saving…') : t('models.form.save', 'Save')}
							</AppButton>
							{existing.length > 0 && (
								<p className="text-xs text-muted-foreground col-start-2">
									{t('models.defaultProviders.currentKey', 'Current key: {{key}}', {
										key: maskApiKey(existing),
									})}
								</p>
							)}
						</div>
					);
				})}
			</div>
		</section>
	);
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ModelsPage: React.FC = () => {
	const { t } = useTranslation();
	const [models, setModels] = useState<ModelConfig[]>([]);
	const [loading, setLoading] = useState(true);
	const [showRegistrationForm, setShowRegistrationForm] = useState(false);
	const [providerSuggestions, setProviderSuggestions] = useState<string[]>([
		...DEFAULT_PROVIDERS.map((provider) => PROVIDER_LABELS[provider].toLowerCase()),
	]);

	const loadModels = useCallback(() => {
		return window.app.getModels().then((loaded) => {
			setModels(loaded);
			setProviderSuggestions((prev) => {
				const next = new Set(prev);
				loaded.forEach((model) => {
					if (model.provider.trim().length > 0) {
						next.add(model.provider.trim());
					}
				});
				return Array.from(next);
			});
			return loaded;
		});
	}, []);

	useEffect(() => {
		loadModels()
			.catch(() => {
				setModels([]);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [loadModels]);

	const handleRegister = useCallback(
		(entry: CreateModelInput) => {
			window.app
				.addModel(entry)
				.then(() => {
					return loadModels();
				})
				.catch(() => {
					// Addition failed — no local state update
				});
		},
		[loadModels]
	);

	const handleDelete = useCallback(
		(id: string) => {
			window.app
				.deleteModel(id)
				.then(() => {
					return loadModels();
				})
				.catch(() => {
					// Deletion failed — keep existing state
				});
		},
		[loadModels]
	);

	const handleSaveProviderApiKey = useCallback(
		async (provider: DefaultProvider, apiKey: string) => {
			const added = await window.app.addModel({
				provider,
				apikey: apiKey,
				baseurl: '',
			});

			const staleEntries = models.filter((entry) => entry.provider === provider && entry.id !== added.id);
			await Promise.all(staleEntries.map((entry) => window.app.deleteModel(entry.id)));
			await loadModels();
		},
		[loadModels, models]
	);

	const handleProviderAdded = useCallback((provider: string) => {
		const normalized = provider.trim();
		if (normalized.length === 0) return;
		setProviderSuggestions((prev) => {
			if (prev.includes(normalized)) return prev;
			return [...prev, normalized];
		});
	}, []);

	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
				<div>
					<h1 className="text-sm font-semibold text-foreground">{t('models.title', 'Models')}</h1>
					<p className="text-xs text-muted-foreground mt-0.5">
						{t('models.subtitle', 'Manage the AI models registered in your workspace.')}
					</p>
				</div>
			</div>

			<div className="flex-1 min-h-0 overflow-y-auto">
				<DefaultProvidersSection models={models} onSaveProviderApiKey={handleSaveProviderApiKey} />

				<AppSeparator />

				<div className="px-6 py-5">
					{showRegistrationForm ? (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<h2 className="text-sm font-semibold text-foreground">
									{t('models.customProvider.title', 'Add custom provider')}
								</h2>
								<AppButton
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setShowRegistrationForm(false)}
								>
									{t('models.customProvider.hide', 'Hide')}
								</AppButton>
							</div>
							<RegistrationForm
								providerSuggestions={providerSuggestions}
								onRegister={handleRegister}
								onProviderAdded={handleProviderAdded}
							/>
						</div>
					) : (
						<AppButton type="button" size="sm" onClick={() => setShowRegistrationForm(true)}>
							{t('models.customProvider.cta', 'Add custom provider')}
						</AppButton>
					)}
				</div>

				<AppSeparator />

				<div className="px-6 py-2 flex flex-col">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<p className="text-xs text-muted-foreground">
								{t('models.loading', 'Loading models…')}
							</p>
						</div>
					) : models.length === 0 ? (
						<ModelsEmptyState />
					) : (
						<div className="divide-y divide-border">
							{models.map((m) => (
								<ModelRow key={m.id} entry={m} onDelete={handleDelete} />
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ModelsPage;
