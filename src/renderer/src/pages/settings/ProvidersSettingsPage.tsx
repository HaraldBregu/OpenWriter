import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppBadge } from '@/components/app';
import type { ProviderConfig } from '../../../../shared/model-defaults';
import { SectionHeader } from './SettingsComponents';

const ProvidersSettingsPage: React.FC = () => {
	const { t } = useTranslation();
	const [models, setModels] = useState<ProviderConfig[]>([]);

	useEffect(() => {
		window.app
			.getModels()
			.then((loaded) => {
				setModels(loaded);
			})
			.catch(() => {
				setModels([]);
			});
	}, []);

	const providers = useMemo(() => {
		const byProvider = new Map<string, number>();
		models.forEach((model) => {
			const provider = model.provider.trim();
			if (provider.length === 0) return;
			byProvider.set(provider, (byProvider.get(provider) ?? 0) + 1);
		});
		return Array.from(byProvider.entries())
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [models]);

	return (
		<div className="w-full max-w-2xl p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.providers.title', 'Providers')}</h1>

			<SectionHeader title={t('settings.providers.registeredProviders', 'Registered Providers')} />

			<p className="text-sm text-muted-foreground mb-4">
				{t(
					'settings.providers.manageNote',
					'Manage provider API keys from the Models page in the main navigation.'
				)}
			</p>

			{providers.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{t('settings.providers.noProviders', 'No providers configured yet.')}
				</p>
			) : (
				<div className="space-y-2">
					{providers.map((provider) => (
						<div key={provider.name} className="flex items-center gap-3 py-2 text-sm">
							<AppBadge variant="secondary" className="shrink-0 text-xs">
								{provider.name}
							</AppBadge>
							<span className="text-xs text-muted-foreground">
								{t('settings.providers.modelsCount', '{{count}} models', {
									count: provider.count,
								})}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default ProvidersSettingsPage;
