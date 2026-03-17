import React from 'react';
import { useTranslation } from 'react-i18next';

// ---------------------------------------------------------------------------
// Section header — small muted text used as a visual divider
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
	readonly title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
	<div className="pt-6 pb-2 first:pt-0">
		<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h2>
	</div>
);

// ---------------------------------------------------------------------------
// Setting row — label + description on the left, action/value on the right
// ---------------------------------------------------------------------------

interface SettingRowProps {
	readonly label: string;
	readonly description?: string;
	readonly children: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, description, children }) => (
	<div className="flex items-center justify-between py-3 border-b last:border-b-0">
		<div className="min-w-0 mr-4">
			<p className="text-sm">{label}</p>
			{description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
		</div>
		<div className="min-w-0">{children}</div>
	</div>
);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const GeneralSettingsPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="w-full max-w-2xl p-6">
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
