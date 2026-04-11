import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProviderId, Service } from '../../../../../shared/types';
import { PROVIDER_IDS, getProvider } from '../../../../../shared/providers';
import { ProviderRow, SectionHeader, SettingRow } from '../components';

const LLM_PROVIDER_IDS: readonly ProviderId[] = PROVIDER_IDS;

const EMAIL_PROVIDERS = ['smtp', 'sendgrid', 'mailgun'] as const;
const CLOUD_STORAGE_PROVIDERS = ['aws-s3', 'google-cloud', 'dropbox'] as const;

const ProvidersPage: React.FC = () => {
	const { t } = useTranslation();
	const [services, setServices] = useState<Array<Service & { id: string }>>([]);

	const loadServices = useCallback(async () => {
		const loaded = await window.app.getServices();
		setServices(loaded);
		return loaded;
	}, []);

	useEffect(() => {
		loadServices().catch(() => {
			setServices([]);
		});
	}, [loadServices]);

	const handleSave = useCallback(
		async (providerId: ProviderId, apiKey: string) => {
			const provider = getProvider(providerId);
			if (!provider) return;

			const added = await window.app.addService({
				provider,
				apiKey,
			});

			const staleEntries = services.filter(
				(entry) => entry.provider.id === providerId && entry.id !== added.id
			);
			await Promise.all(staleEntries.map((entry) => window.app.deleteService(entry.id)));
			await loadServices();
		},
		[loadServices, services]
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
