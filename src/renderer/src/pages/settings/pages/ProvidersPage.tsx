import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProviderId, ServiceProvider } from '../../../../../shared/types';
import { PROVIDER_IDS } from '../../../../../shared/providers';
import { ProviderRow, SectionHeader, SettingRow } from '../components';

const LLM_PROVIDER_IDS: readonly ProviderId[] = PROVIDER_IDS;

const EMAIL_PROVIDERS = ['smtp', 'sendgrid', 'mailgun'] as const;
const CLOUD_STORAGE_PROVIDERS = ['aws-s3', 'google-cloud', 'dropbox'] as const;

const ProvidersPage: React.FC = () => {
	const { t } = useTranslation();
	const [providers, setProviders] = useState<Array<ServiceProvider & { id: string }>>([]);

	const loadProviders = useCallback(async () => {
		const loaded = await window.app.getProviders();
		setProviders(loaded);
		return loaded;
	}, []);

	useEffect(() => {
		loadProviders().catch(() => {
			setProviders([]);
		});
	}, [loadProviders]);

	const handleSave = useCallback(
		async (provider: ProviderId, apiKey: string) => {
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

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.providers.title', 'Providers')}</h1>
			<p className="text-sm text-muted-foreground -mt-4 mb-6">
				{t(
					'models.defaultProviders.subtitle',
					'Configure API keys for the most important providers.'
				)}
			</p>

			<SectionHeader title={t('settings.providers.llm', 'LLM Providers')} />
			{LLM_PROVIDER_IDS.map((provider) => {
				const existingKey = providers.find((m) => m.name === provider)?.apikey ?? '';
				return (
					<ProviderRow
						key={provider}
						provider={provider}
						existingKey={existingKey}
						onSave={handleSave}
					/>
				);
			})}

			<SectionHeader title={t('settings.providers.email', 'Email Providers')} />
			{EMAIL_PROVIDERS.map((provider) => (
				<SettingRow key={provider} label={provider}>
					<span className="text-sm text-muted-foreground">
						{t('settings.providers.comingSoon', 'Coming soon')}
					</span>
				</SettingRow>
			))}

			<SectionHeader title={t('settings.providers.cloudStorage', 'Cloud Storage')} />
			{CLOUD_STORAGE_PROVIDERS.map((provider) => (
				<SettingRow key={provider} label={provider}>
					<span className="text-sm text-muted-foreground">
						{t('settings.providers.comingSoon', 'Coming soon')}
					</span>
				</SettingRow>
			))}
		</div>
	);
};

export default ProvidersPage;
