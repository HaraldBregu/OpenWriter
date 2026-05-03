import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/Switch';
import {
	ItemRow,
	ItemRowActions,
	ItemRowContent,
	ItemRowTitle,
	ItemRowDescription,
} from '@/components/ui/ItemRow';
import { SectionHeader } from '../components';

const DeveloperPage: React.FC = () => {
	const { t } = useTranslation();
	const [developerMode, setDeveloperMode] = useState(false);

	const handleToggle = useCallback((checked: boolean) => {
		setDeveloperMode(checked);
	}, []);

	return (
		<div className="w-full max-w-2xl">
			<h1 className="text-lg font-normal mb-6">{t('settings.tabs.developer')}</h1>

			<SectionHeader title={t('settings.sections.developer')} />

			<div className="flex flex-col gap-2">
				<ItemRow variant="bottom-bordered" size="none">
					<ItemRowContent>
						<ItemRowTitle>{t('settings.developer.mode')}</ItemRowTitle>
						<ItemRowDescription>{t('settings.developer.modeDescription')}</ItemRowDescription>
					</ItemRowContent>
					<ItemRowActions>
						<Switch checked={developerMode} onCheckedChange={handleToggle} />
					</ItemRowActions>
				</ItemRow>
			</div>
		</div>
	);
};

export default DeveloperPage;
