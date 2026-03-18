import React from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from './SettingsComponents';
import { ThemeModeSelector } from './ThemeModeSelector';
import { LanguageSelector } from './LanguageSelector';

const SystemSettingsPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="w-full max-w-2xl p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.tabs.system')}</h1>

			<SectionHeader title={t('settings.sections.layout')} />

			<h2 className="text-sm font-normal mb-1">{t('settings.theme.title')}</h2>
			<p className="text-xs text-muted-foreground mb-4">{t('settings.theme.description')}</p>
			<div className="rounded-md border divide-y">
				<ThemeModeSelector />
			</div>

			<h2 className="text-sm font-normal mb-1 mt-6">{t('settings.language.title')}</h2>
			<p className="text-xs text-muted-foreground mb-4">
				{t('settings.language.description')}
			</p>
			<div className="rounded-md border divide-y">
				<LanguageSelector />
			</div>
		</div>
	);
};

export default SystemSettingsPage;
