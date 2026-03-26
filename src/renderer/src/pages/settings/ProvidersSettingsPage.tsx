import React, { useState, useCallback, useId, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import type { ServiceProvider } from '../../../../shared/model-defaults';
import {
	PROVIDER_IDS,
	type ProviderId,
	PROVIDER_CATALOGUE,
} from '../../../../shared/model-constants';
import { AppButton, AppInput, AppLabel, AppSeparator } from '@/components/app';

function isDefaultProvider(provider: string): provider is ProviderId {
	return (PROVIDER_IDS as readonly string[]).includes(provider);
}

const PROVIDER_LABELS: Record<ProviderId, string> = PROVIDER_IDS.reduce(
	(acc, providerId) => {
		const label =
			PROVIDER_CATALOGUE.find((provider) => provider.id === providerId)?.name ?? providerId;
		acc[providerId] = label;
		return acc;
	},
	{} as Record<ProviderId, string>
);

const MASKED_API_KEY = '********';

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

interface RegistrationFormProps {
	providerSuggestions: string[];
	onRegister: (entry: ServiceProvider) => void;
	onProviderAdded: (provider: string) => void;
	onCancel: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({
	providerSuggestions,
	onRegister,
	onProviderAdded,
	onCancel,
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
				provider: provider,
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

			<div className="flex justify-end gap-2 mt-4">
				<AppButton type="button" size="sm" variant="ghost" onClick={onCancel}>
					{t('models.form.cancel', 'Cancel')}
				</AppButton>
				<AppButton type="submit" size="sm" disabled={!isValid}>
					{t('models.form.save', 'Save')}
				</AppButton>
			</div>
		</form>
	);
};

interface DefaultProvidersSectionProps {
	models: ServiceProvider[];
	onSaveProviderApiKey: (provider: string, apiKey: string) => Promise<void>;
}

const DefaultProvidersSection: React.FC<DefaultProvidersSectionProps> = ({
	models,
	onSaveProviderApiKey,
}) => {
	const { t } = useTranslation();
	const uid = useId();
	const [apiKeys, setApiKeys] = useState<Record<ProviderId, string>>(
		() => Object.fromEntries(PROVIDER_IDS.map((id) => [id, ''])) as Record<ProviderId, string>
	);
	const [visible, setVisible] = useState<Record<ProviderId, boolean>>(
		() => Object.fromEntries(PROVIDER_IDS.map((id) => [id, false])) as Record<ProviderId, boolean>
	);
	const [saving, setSaving] = useState<Record<ProviderId, boolean>>(
		() => Object.fromEntries(PROVIDER_IDS.map((id) => [id, false])) as Record<ProviderId, boolean>
	);

	const handleApiKeyChange = useCallback((provider: ProviderId, value: string) => {
		setApiKeys((prev) => ({ ...prev, [provider]: value }));
	}, []);

	const handleToggleVisibility = useCallback((provider: ProviderId) => {
		setVisible((prev) => ({ ...prev, [provider]: !prev[provider] }));
	}, []);

	const handleSaveProvider = useCallback(
		async (provider: ProviderId) => {
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
		<section>
			<div className="space-y-3">
				{PROVIDER_IDS.map((provider) => {
					const existing = models.find((m) => m.provider === provider)?.apikey ?? '';
					const hasInputValue = apiKeys[provider].trim().length > 0;
					const displayValue = hasInputValue
						? apiKeys[provider]
						: existing.length > 0
							? MASKED_API_KEY
							: '';
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
									value={displayValue}
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
						</div>
					);
				})}
			</div>
		</section>
	);
};

interface CustomProvidersSectionProps {
	models: ServiceProvider[];
	onSaveProviderApiKey: (provider: string, apiKey: string) => Promise<void>;
	onDeleteProvider: (provider: string) => Promise<void>;
	showRegistrationForm: boolean;
	onToggleRegistrationForm: () => void;
	providerSuggestions: string[];
	onRegister: (entry: ServiceProvider) => void;
	onProviderAdded: (provider: string) => void;
	onCancelRegistrationForm: () => void;
}

const CustomProvidersSection: React.FC<CustomProvidersSectionProps> = ({
	models,
	onSaveProviderApiKey,
	onDeleteProvider,
	showRegistrationForm,
	onToggleRegistrationForm,
	providerSuggestions,
	onRegister,
	onProviderAdded,
	onCancelRegistrationForm,
}) => {
	const { t } = useTranslation();
	const uid = useId();
	const customProviders = useMemo(() => {
		const unique = new Set<string>();
		models.forEach((model) => {
			const provider = model.provider.trim();
			if (provider.length > 0 && !isDefaultProvider(provider)) {
				unique.add(provider);
			}
		});
		return Array.from(unique).sort((a, b) => a.localeCompare(b));
	}, [models]);
	const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
	const [visible, setVisible] = useState<Record<string, boolean>>({});
	const [saving, setSaving] = useState<Record<string, boolean>>({});
	const [deleting, setDeleting] = useState<Record<string, boolean>>({});

	const handleApiKeyChange = useCallback((provider: string, value: string) => {
		setApiKeys((prev) => ({ ...prev, [provider]: value }));
	}, []);

	const handleToggleVisibility = useCallback((provider: string) => {
		setVisible((prev) => ({ ...prev, [provider]: !prev[provider] }));
	}, []);

	const handleSaveProvider = useCallback(
		async (provider: string) => {
			const apiKey = (apiKeys[provider] ?? '').trim();
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

	const handleDeleteProvider = useCallback(
		async (provider: string) => {
			if (deleting[provider]) return;
			setDeleting((prev) => ({ ...prev, [provider]: true }));
			try {
				await onDeleteProvider(provider);
			} catch {
				// Deletion failed — keep current state
			} finally {
				setDeleting((prev) => ({ ...prev, [provider]: false }));
			}
		},
		[deleting, onDeleteProvider]
	);

	return (
		<section>
			<div className="mb-4 flex items-start justify-between gap-3">
				<h2 className="text-sm font-semibold text-foreground">
					{t('models.customProviders.title', 'Custom Providers')}
				</h2>
				<AppButton
					type="button"
					variant="ghost"
					size="icon-xs"
					aria-label={
						showRegistrationForm
							? t('models.customProvider.hide', 'Hide custom provider')
							: t('models.customProvider.cta', 'Add custom provider')
					}
					onClick={onToggleRegistrationForm}
				>
					<Plus />
				</AppButton>
			</div>
			<p className="text-xs text-muted-foreground mt-0.5 mb-4">
				{t('models.customProviders.subtitle', 'Configure API keys for your custom providers.')}
			</p>

			{showRegistrationForm && (
				<div className="mb-4">
					<RegistrationForm
						providerSuggestions={providerSuggestions}
						onRegister={onRegister}
						onProviderAdded={onProviderAdded}
						onCancel={onCancelRegistrationForm}
					/>
				</div>
			)}

			{customProviders.length === 0 ? (
				<p className="text-xs text-muted-foreground">
					{t('models.customProviders.empty', 'No custom providers yet.')}
				</p>
			) : (
				<div className="space-y-3">
					{customProviders.map((provider) => {
						const existing = models.find((m) => m.provider === provider)?.apikey ?? '';
						const inputValue = apiKeys[provider] ?? '';
						const hasInputValue = inputValue.trim().length > 0;
						const displayValue = hasInputValue
							? inputValue
							: existing.length > 0
								? MASKED_API_KEY
								: '';
						const isSaving = Boolean(saving[provider]);
						const isDeleting = Boolean(deleting[provider]);
						const isVisible = Boolean(visible[provider]);
						const visibilityLabel = isVisible
							? t('models.hideApiKey', 'Hide API key')
							: t('models.showApiKey', 'Show API key');

						return (
							<div key={provider} className="grid grid-cols-[120px_1fr_auto] gap-3 items-end">
								<div className="flex flex-col gap-1.5">
									<AppLabel htmlFor={`${uid}-${provider}-apikey`} className="text-xs font-medium">
										{provider}
									</AppLabel>
								</div>
								<div className="relative flex items-center">
									<AppInput
										id={`${uid}-${provider}-apikey`}
										type={isVisible ? 'text' : 'password'}
										value={displayValue}
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
										{isVisible ? <EyeOff /> : <Eye />}
									</AppButton>
								</div>
								<div className="flex items-center justify-end gap-2">
									<AppButton
										type="button"
										size="sm"
										disabled={!hasInputValue || isSaving || isDeleting}
										onClick={() => {
											void handleSaveProvider(provider);
										}}
									>
										{isSaving ? t('models.saving', 'Saving…') : t('models.form.save', 'Save')}
									</AppButton>
									<AppButton
										type="button"
										variant="ghost"
										size="icon-xs"
										aria-label={t('models.deleteProvider', 'Delete provider')}
										disabled={isDeleting || isSaving}
										onClick={() => {
											void handleDeleteProvider(provider);
										}}
										className="text-muted-foreground hover:text-destructive"
									>
										<Trash2 />
									</AppButton>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
};

const ProvidersSettingsPage: React.FC = () => {
	const { t } = useTranslation();
	const [models, setModels] = useState<ServiceProvider[]>([]);
	const [showRegistrationForm, setShowRegistrationForm] = useState(false);
	const [providerSuggestions, setProviderSuggestions] = useState<string[]>([...PROVIDER_IDS]);

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
		loadModels().catch(() => {
			setModels([]);
		});
	}, [loadModels]);

	const handleRegister = useCallback(
		(entry: ServiceProvider) => {
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

	const handleSaveProviderApiKey = useCallback(
		async (provider: string, apiKey: string) => {
			const added = await window.app.addModel({
				name: provider,
				apikey: apiKey,
				baseurl: '',
			});

			const staleEntries = models.filter(
				(entry) => entry.provider === provider && entry.id !== added.id
			);
			await Promise.all(staleEntries.map((entry) => window.app.deleteModel(entry.id)));
			await loadModels();
		},
		[loadModels, models]
	);

	const handleDeleteProvider = useCallback(
		async (provider: string) => {
			const entries = models.filter((entry) => entry.provider === provider);
			await Promise.all(entries.map((entry) => window.app.deleteModel(entry.id)));
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
		<div className="w-full max-w-2xl p-6">
			<h1 className="text-xl font-normal mb-6">{t('settings.providers.title', 'Providers')}</h1>
			<p className="text-sm text-muted-foreground -mt-4 mb-6">
				{t(
					'models.defaultProviders.subtitle',
					'Configure API keys for the most important providers.'
				)}
			</p>

			<div className="space-y-10">
				<DefaultProvidersSection models={models} onSaveProviderApiKey={handleSaveProviderApiKey} />

				<AppSeparator />

				<CustomProvidersSection
					models={models}
					onSaveProviderApiKey={handleSaveProviderApiKey}
					onDeleteProvider={handleDeleteProvider}
					showRegistrationForm={showRegistrationForm}
					onToggleRegistrationForm={() => setShowRegistrationForm((prev) => !prev)}
					providerSuggestions={providerSuggestions}
					onRegister={handleRegister}
					onProviderAdded={handleProviderAdded}
					onCancelRegistrationForm={() => setShowRegistrationForm(false)}
				/>
			</div>
		</div>
	);
};

export default ProvidersSettingsPage;
