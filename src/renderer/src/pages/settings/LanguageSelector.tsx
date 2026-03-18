import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppRadioGroup, AppRadioGroupItem, AppLabel } from '@/components/app';
import { useLanguageMode, useAppActions } from '../../contexts';
import type { AppLanguage } from '../../contexts';

export function LanguageSelector(): React.ReactElement {
	const language = useLanguageMode();
	const { setLanguage } = useAppActions();
	const { t } = useTranslation();

	const languageOptions: { value: AppLanguage; label: string; description: string }[] = [
		{
			value: 'en',
			label: t('settings.language.en'),
			description: t('settings.language.enDescription'),
		},
		{
			value: 'it',
			label: t('settings.language.it'),
			description: t('settings.language.itDescription'),
		},
	];

	return (
		<AppRadioGroup
			value={language}
			onValueChange={(value) => setLanguage(value as AppLanguage)}
			className="grid gap-0"
			aria-label={t('settings.language.title')}
		>
			{languageOptions.map((option) => (
				<div key={option.value} className="flex items-center justify-between px-4 py-3">
					<div className="flex flex-col gap-0.5">
						<AppLabel
							htmlFor={`language-${option.value}`}
							className="text-sm font-normal cursor-pointer"
						>
							{option.label}
						</AppLabel>
						<span className="text-xs text-muted-foreground">{option.description}</span>
					</div>
					<AppRadioGroupItem id={`language-${option.value}`} value={option.value} />
				</div>
			))}
		</AppRadioGroup>
	);
}
