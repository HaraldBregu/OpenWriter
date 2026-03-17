import React from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeModeSelector } from './ThemeModeSelector';

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
// Main page
// ---------------------------------------------------------------------------

const GeneralSettingsPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="w-full max-w-2xl p-6">
			{/* Page title */}
			<h1 className="text-lg font-normal mb-6">{t('settings.title')}</h1>

			{/* ── Theme ───────────────────────────────────────────────────── */}
			<SectionHeader title={t('settings.theme.title')} />
			<ThemeModeSelector />
		</div>
	);
};

export default GeneralSettingsPage;
