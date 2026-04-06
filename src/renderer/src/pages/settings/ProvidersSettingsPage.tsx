import React, { useState, useCallback, useId, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';
import type { ServiceProvider } from '../../../../shared/provider-constants';
import {
	PROVIDER_IDS,
	type ProviderId,
	PROVIDER_CATALOGUE,
} from '../../../../shared/provider-constants';
import {
	AppButton,
	AppCard,
	AppCardContent,
	AppCardFooter,
	AppCardHeader,
	AppCardTitle,
	AppInput,
	AppLabel,
} from '@/components/app';

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

interface DefaultProvidersSectionProps {
	providers: Array<ServiceProvider & { id: string }>;
	onSaveProviderApiKey: (provider: string, apiKey: string) => Promise<void>;
	onDeleteProvider: (provider: string) => Promise<void>;
}

const DefaultProvidersSection: React.FC<DefaultProvidersSectionProps> = ({
	providers,
	onSaveProviderApiKey,
	onDeleteProvider,
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
	const [deleting, setDeleting] = useState<Record<ProviderId, boolean>>(
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

	const handleDeleteProvider = useCallback(
		async (provider: ProviderId) => {
			if (deleting[provider]) return;
			setDeleting((prev) => ({ ...prev, [provider]: true }));
			try {
				await onDeleteProvider(provider);
				setApiKeys((prev) => ({ ...prev, [provider]: '' }));
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
			<div className="space-y-4">
				{PROVIDER_IDS.map((provider) => {
					const existing = providers.find((m) => m.name === provider)?.apikey ?? '';
					const hasInputValue = apiKeys[provider].trim().length > 0;
					const displayValue = hasInputValue
						? apiKeys[provider]
						: existing.length > 0
							? MASKED_API_KEY
							: '';
					const isSaving = saving[provider];
					const isDeleting = deleting[provider];
					const visibilityLabel = visible[provider]
						? t('models.hideApiKey', 'Hide API key')
						: t('models.showApiKey', 'Show API key');

					return (
						<AppCard key={provider}>
							<AppCardHeader className="pb-3">
								<AppCardTitle className="text-sm font-medium">
									{PROVIDER_LABELS[provider]}
								</AppCardTitle>
							</AppCardHeader>
							<AppCardContent className="pb-3">
								<AppLabel htmlFor={`${uid}-${provider}-apikey`} className="sr-only">
									{PROVIDER_LABELS[provider]}
								</AppLabel>
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
							</AppCardContent>
							<AppCardFooter className="flex gap-2 pt-0">
								<AppButton
									type="button"
									size="sm"
									disabled={!hasInputValue || isSaving || isDeleting}
									onClick={() => {
										void handleSaveProvider(provider);
									}}
								>
									{isSaving ? (
										<>
											<Loader2 className="animate-spin" />
											{t('models.saving', 'Saving…')}
										</>
									) : (
										t('models.form.save', 'Save')
									)}
								</AppButton>
								<AppButton
									type="button"
									size="sm"
									variant="ghost"
									disabled={isDeleting || isSaving}
									onClick={() => {
										void handleDeleteProvider(provider);
									}}
									className="text-muted-foreground hover:text-destructive"
								>
									{isDeleting ? (
										<>
											<Loader2 className="animate-spin" />
											{t('models.deleting', 'Deleting…')}
										</>
									) : (
										<>
											<Trash2 />
											{t('models.deleteProvider', 'Delete')}
										</>
									)}
								</AppButton>
							</AppCardFooter>
						</AppCard>
					);
				})}
			</div>
		</section>
	);
};

const ProvidersSettingsPage: React.FC = () => {
	const { t } = useTranslation();
	const [providers, setProviders] = useState<Array<ServiceProvider & { id: string }>>([]);
	const [showRegistrationForm, setShowRegistrationForm] = useState(false);
	const [providerSuggestions, setProviderSuggestions] = useState<string[]>([...PROVIDER_IDS]);

	const loadProviders = useCallback(async () => {
		const loaded = await window.app.getProviders();
		setProviders(loaded);
		setProviderSuggestions((prev) => {
			const next = new Set(prev);
			loaded.forEach((model) => {
				if (model.name.trim().length > 0) {
					next.add(model.name.trim());
				}
			});
			return Array.from(next);
		});
		return loaded;
	}, []);

	useEffect(() => {
		loadProviders().catch(() => {
			setProviders([]);
		});
	}, [loadProviders]);

	const handleRegister = useCallback(
		(entry: ServiceProvider) => {
			window.app
				.addProvider(entry)
				.then(() => {
					return loadProviders();
				})
				.catch(() => {
					// Addition failed — no local state update
				});
		},
		[loadProviders]
	);

	const handleSaveProviderApiKey = useCallback(
		async (provider: string, apiKey: string) => {
			const added = await window.app.addProvider({
				name: provider,
				apikey: apiKey,
				baseurl: '',
			});

			const staleEntries = providers.filter(
				(entry) => entry.name === provider && entry.id !== added.id
			);
			await Promise.all(staleEntries.map((entry) => window.app.deleteProvider(entry.id)));
			await loadProviders();
		},
		[loadProviders, providers]
	);

	const handleDeleteProvider = useCallback(
		async (provider: string) => {
			const entries = providers.filter((entry) => entry.name === provider);
			await Promise.all(entries.map((entry) => window.app.deleteProvider(entry.id)));
			await loadProviders();
		},
		[loadProviders, providers]
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
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-xl font-normal mb-6">{t('settings.providers.title', 'Providers')}</h1>
			<p className="text-sm text-muted-foreground -mt-4 mb-6">
				{t(
					'models.defaultProviders.subtitle',
					'Configure API keys for the most important providers.'
				)}
			</p>

			<div className="space-y-10">
				<DefaultProvidersSection
					providers={providers}
					onSaveProviderApiKey={handleSaveProviderApiKey}
					onDeleteProvider={handleDeleteProvider}
				/>

				<AppSeparator />

				<CustomProvidersSection
					providers={providers}
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
