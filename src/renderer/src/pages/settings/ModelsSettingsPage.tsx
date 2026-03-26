import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppBadge } from '@/components/app';
import type { ProviderConfig } from '../../../../shared/model-defaults';
import { SectionHeader } from './SettingsComponents';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskApiKey(key: string): string {
	if (key.length === 0) return '—';
	if (key.length <= 4) return '••••';
	return `${key.slice(0, 3)}${'•'.repeat(8)}${key.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ModelsSettingsPage: React.FC = () => {
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

	return (
		<div className="w-full max-w-2xl p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.models.title')}</h1>

			<SectionHeader title={t('settings.models.registeredModels', 'Registered Models')} />

			<p className="text-sm text-muted-foreground mb-4">
				{t(
					'settings.models.manageNote',
					'Manage your models from the Models page in the main navigation.'
				)}
			</p>

			{models.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{t('settings.models.noModels', 'No models registered yet.')}
				</p>
			) : (
				<div className="space-y-2">
					{models.map((m) => (
						<div key={m.id} className="flex items-center gap-3 py-2 text-sm">
							<AppBadge variant="secondary" className="shrink-0 text-xs">
								{m.provider}
							</AppBadge>
							{m.apikey.length > 0 && (
								<span className="font-mono text-xs text-muted-foreground shrink-0">
									{maskApiKey(m.apikey)}
								</span>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default ModelsSettingsPage;
