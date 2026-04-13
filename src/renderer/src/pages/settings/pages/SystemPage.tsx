import React from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeader, ThemeModeSelector, LanguageSelector } from '../components';

const SystemPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.tabs.system')}</h1>

			<SectionHeader title={t('settings.theme.title')} />
			<ThemeModeSelector />

			<SectionHeader title={t('settings.language.title')} />
			<LanguageSelector />
		</div>
	);
};

export default SystemPage;
