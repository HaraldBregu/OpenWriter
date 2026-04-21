import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader, SettingRow } from '../components';

const SkillPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-1">{t('settings.skill.title')}</h1>
			<p className="text-sm text-muted-foreground mb-6">{t('settings.skill.subtitle')}</p>

			<SectionHeader title={t('settings.sections.skill')} />

			<SettingRow
				label={t('settings.skill.library')}
				description={t('settings.skill.libraryDescription')}
			>
				<Badge variant="secondary">{t('settings.skill.status')}</Badge>
			</SettingRow>
		</div>
	);
};

export default SkillPage;
