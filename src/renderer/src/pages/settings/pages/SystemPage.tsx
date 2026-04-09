import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	AppSelect,
	AppSelectTrigger,
	AppSelectValue,
	AppSelectContent,
	AppSelectItem,
} from '@/components/app';
import { SectionHeader, SettingRow, ThemeSegmentControl } from '../components';
import {
	useThemeMode,
	useAppTheme,
	useCustomThemeId,
	useLanguageMode,
	useAppActions,
} from '../../../contexts';
import type { ThemeMode, AppLanguage } from '../../../contexts';
import type { CustomThemeInfo } from '../../../../../shared/types';

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
// Default theme value
// ---------------------------------------------------------------------------

const DEFAULT_THEME_VALUE = 'default';
const DEFAULT_THEME_LABEL_KEY = 'settings.appTheme.default';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const SystemPage: React.FC = () => {
	const { t } = useTranslation();
	const themeMode = useThemeMode();
	const appTheme = useAppTheme();
	const customThemeId = useCustomThemeId();
	const language = useLanguageMode();
	const { setTheme, setAppTheme, setCustomTheme, setLanguage } = useAppActions();
	const [customThemes, setCustomThemes] = useState<CustomThemeInfo[]>([]);

	const loadCustomThemes = useCallback(async () => {
		try {
			const list = await window.app.getCustomThemes();
			setCustomThemes(list);
		} catch {
			setCustomThemes([]);
		}
	}, []);

	useEffect(() => {
		loadCustomThemes();
	}, [loadCustomThemes]);

	const selectedThemeValue = customThemeId ?? appTheme;

	const handleThemeChange = (next: ThemeMode): void => {
		setTheme(next);
	};

	const handleAppThemeChange = (next: string): void => {
		if (next === DEFAULT_THEME_VALUE) {
			setCustomTheme(null);
			setAppTheme('default');
		} else {
			setCustomTheme(next);
		}
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

export default SystemPage;
