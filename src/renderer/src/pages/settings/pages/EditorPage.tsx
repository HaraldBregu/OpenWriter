import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { SectionHeader, SettingRow } from '../components';

interface FontOption {
	readonly value: string;
	readonly labelKey: string;
}

const FONT_OPTIONS: readonly FontOption[] = [
	{ value: 'default', labelKey: 'settings.editor.fontDefault' },
	{ value: 'sans-system', labelKey: 'settings.editor.fontSansSystem' },
	{ value: 'dyslexic-friendly', labelKey: 'settings.editor.fontDyslexicFriendly' },
] as const;

const EditorPage: React.FC = () => {
	const { t } = useTranslation();
	const [font, setFont] = useState('default');

	const handleFontChange = useCallback((next: string | null) => {
		if (next !== null) setFont(next);
	}, []);

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.tabs.editor')}</h1>

			<SectionHeader title={t('settings.sections.editor')} />

			<SettingRow
				label={t('settings.editor.font')}
				description={t('settings.editor.fontDescription')}
			>
				<Select value={font} onValueChange={handleFontChange}>
					<SelectTrigger className="w-44 h-8 text-sm" aria-label={t('settings.editor.font')}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{FONT_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{t(option.labelKey)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</SettingRow>
		</div>
	);
};

export default EditorPage;
