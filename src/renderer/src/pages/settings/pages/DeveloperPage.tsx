import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/Switch';
import { SectionHeader, SettingRow } from '../components';

const DeveloperPage: React.FC = () => {
	const { t } = useTranslation();
	const [developerMode, setDeveloperMode] = useState(false);

	const handleToggle = useCallback((checked: boolean) => {
		setDeveloperMode(checked);
	}, []);

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.tabs.developer')}</h1>

			<SectionHeader title={t('settings.sections.developer')} />

			<SettingRow
				label={t('settings.developer.mode')}
				description={t('settings.developer.modeDescription')}
			>
				<AppSwitch checked={developerMode} onCheckedChange={handleToggle} />
			</SettingRow>
		</div>
	);
};

export default DeveloperPage;
