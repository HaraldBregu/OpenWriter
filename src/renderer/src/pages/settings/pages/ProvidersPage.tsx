import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { PROVIDER_CATALOGUE } from '../../../../../shared/providers';
import { ProvidersProvider } from '../../providers/Provider';
import { Bootstrap, ProviderForm } from '../../providers/Page';

export default function ProvidersPage(): ReactElement {
	const { t } = useTranslation();

	return (
		<ProvidersProvider>
			<Bootstrap />
			<div className="w-full max-w-2xl">
				<h1 className="text-lg font-normal mb-6">{t('settings.tabs.providers', 'Providers')}</h1>
				<div className="flex flex-col gap-10">
					{PROVIDER_CATALOGUE.map((provider) => (
						<ProviderForm key={provider.id} provider={provider} />
					))}
				</div>
			</div>
		</ProvidersProvider>
	);
}
