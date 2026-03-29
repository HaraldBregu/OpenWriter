import React from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeader, SettingRow } from './SettingsComponents';

const GeneralSettingsPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.title')}</h1>

			<SectionHeader title={t('settings.sections.application')} />

			<SettingRow label={t('settings.application.name')}>
				<span className="text-sm">{__APP_NAME__}</span>
			</SettingRow>

			<SettingRow label={t('settings.application.description')}>
				<span className="text-sm text-muted-foreground">{__APP_DESCRIPTION__}</span>
			</SettingRow>

			<SettingRow label={t('settings.application.version')}>
				<span className="font-mono text-sm">{__APP_VERSION__}</span>
			</SettingRow>

			<SettingRow label={t('settings.application.author')}>
				<span className="text-sm">{__APP_AUTHOR__}</span>
			</SettingRow>

			<SettingRow label={t('settings.application.license')}>
				<span className="text-sm">{__APP_LICENSE__}</span>
			</SettingRow>
		</div>
	);
};

export default GeneralSettingsPage;
