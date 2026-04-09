import React from 'react';
import { useTranslation } from 'react-i18next';
import {
	AppSelect,
	AppSelectTrigger,
	AppSelectValue,
	AppSelectContent,
	AppSelectItem,
} from '@/components/app';
import { SectionHeader, SettingRow, ThemeSegmentControl } from './components';
import { useThemeMode, useAppTheme, useLanguageMode, useAppActions } from '../../contexts';
import type { ThemeMode, AppTheme, AppLanguage } from '../../contexts';

// ---------------------------------------------------------------------------
// Language options
// ---------------------------------------------------------------------------

interface LanguageOption {
	readonly value: AppLanguage;
	readonly labelKey: string;
}

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
	{ value: 'en', labelKey: 'settings.language.en' },
	{ value: 'it', labelKey: 'settings.language.it' },
] as const;

// ---------------------------------------------------------------------------
// App theme options
// ---------------------------------------------------------------------------

interface AppThemeOption {
	readonly value: AppTheme;
	readonly labelKey: string;
}

const APP_THEME_OPTIONS: readonly AppThemeOption[] = [
	{ value: 'default', labelKey: 'settings.appTheme.default' },
	{ value: 'aurora', labelKey: 'settings.appTheme.aurora' },
	{ value: 'ember', labelKey: 'settings.appTheme.ember' },
	{ value: 'ocean', labelKey: 'settings.appTheme.ocean' },
	{ value: 'forest', labelKey: 'settings.appTheme.forest' },
	{ value: 'lavender', labelKey: 'settings.appTheme.lavender' },
	{ value: 'midnight', labelKey: 'settings.appTheme.midnight' },
	{ value: 'sandstone', labelKey: 'settings.appTheme.sandstone' },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const SystemPage: React.FC = () => {
	const { t } = useTranslation();
	const themeMode = useThemeMode();
	const appTheme = useAppTheme();
	const language = useLanguageMode();
	const { setTheme, setAppTheme, setLanguage } = useAppActions();

	const handleThemeChange = (next: ThemeMode): void => {
		setTheme(next);
	};

	const handleAppThemeChange = (next: string): void => {
		const option = APP_THEME_OPTIONS.find((o) => o.value === next);
		if (option) setAppTheme(option.value);
	};

	const handleLanguageChange = (next: string): void => {
		const option = LANGUAGE_OPTIONS.find((o) => o.value === next);
		if (option) setLanguage(option.value);
	};

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.tabs.system')}</h1>

			<SectionHeader title={t('settings.sections.layout')} />

			<SettingRow label={t('settings.theme.title')} description={t('settings.theme.description')}>
				<ThemeSegmentControl
					value={themeMode}
					onChange={handleThemeChange}
					groupLabel={t('settings.theme.title')}
				/>
			</SettingRow>

			<SettingRow
				label={t('settings.appTheme.title')}
				description={t('settings.appTheme.description')}
			>
				<AppSelect value={appTheme} onValueChange={handleAppThemeChange}>
					<AppSelectTrigger className="w-32 h-8 text-sm" aria-label={t('settings.appTheme.title')}>
						<AppSelectValue />
					</AppSelectTrigger>
					<AppSelectContent>
						{APP_THEME_OPTIONS.map((option) => (
							<AppSelectItem key={option.value} value={option.value}>
								{t(option.labelKey)}
							</AppSelectItem>
						))}
					</AppSelectContent>
				</AppSelect>
			</SettingRow>

			<SettingRow
				label={t('settings.language.title')}
				description={t('settings.language.description')}
			>
				<AppSelect value={language} onValueChange={handleLanguageChange}>
					<AppSelectTrigger className="w-32 h-8 text-sm" aria-label={t('settings.language.title')}>
						<AppSelectValue />
					</AppSelectTrigger>
					<AppSelectContent>
						{LANGUAGE_OPTIONS.map((option) => (
							<AppSelectItem key={option.value} value={option.value}>
								{t(option.labelKey)}
							</AppSelectItem>
						))}
					</AppSelectContent>
				</AppSelect>
			</SettingRow>
		</div>
	);
};

export default SystemSettingsPage;
