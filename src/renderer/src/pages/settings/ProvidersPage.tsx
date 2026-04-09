import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProviderId, ServiceProvider } from '../../../../shared/types';
import { PROVIDER_IDS } from '../../../../shared/providers';
import { ProviderRow } from './components';

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

			{PROVIDER_IDS.map((provider) => {
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
		</div>
	);
};

export default ProvidersSettingsPage;
