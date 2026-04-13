import React from 'react';
import { useTranslation } from 'react-i18next';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import { Moon, Monitor, Sun } from 'lucide-react';
import { SectionHeader, SettingRow } from '../components';
import { useThemeMode, useLanguageMode, useAppActions } from '../../../contexts';
import type { ThemeMode, AppLanguage } from '../../../contexts';

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
// Page
// ---------------------------------------------------------------------------

const SystemPage: React.FC = () => {
	const { t } = useTranslation();
	const themeMode = useThemeMode();
	const language = useLanguageMode();
	const { setTheme, setLanguage } = useAppActions();

	const handleThemeChange = (next: ThemeMode): void => {
		setTheme(next);
	};

	const handleLanguageChange = (next: string | null): void => {
		if (next === null) return;
		const option = LANGUAGE_OPTIONS.find((o) => o.value === next);
		if (option) setLanguage(option.value);
	};

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.tabs.system')}</h1>

			<SectionHeader title={t('settings.sections.layout')} />

			<SettingRow label={t('settings.theme.title')} description={t('settings.theme.description')}>
				<ButtonGroup>
					<Button
						variant={themeMode === 'light' ? 'outline-selected' : 'outline'}
						size="icon-sm"
						onClick={() => handleThemeChange('light')}
						aria-label={t('settings.theme.light')}
						aria-pressed={themeMode === 'light'}
					>
						<Sun className="size-3.5" />
					</Button>
					<Button
						variant={themeMode === 'system' ? 'outline-selected' : 'outline'}
						size="icon-sm"
						onClick={() => handleThemeChange('system')}
						aria-label={t('settings.theme.system')}
						aria-pressed={themeMode === 'system'}
					>
						<Monitor className="size-3.5" />
					</Button>
					<Button
						variant={themeMode === 'dark' ? 'outline-selected' : 'outline'}
						size="icon-sm"
						onClick={() => handleThemeChange('dark')}
						aria-label={t('settings.theme.dark')}
						aria-pressed={themeMode === 'dark'}
					>
						<Moon className="size-3.5" />
					</Button>
				</ButtonGroup>
			</SettingRow>

			<SettingRow
				label={t('settings.appTheme.title')}
				description={t('settings.appTheme.description')}
			>
				<Select value={selectedThemeValue} onValueChange={handleAppThemeChange}>
					<SelectTrigger className="w-32 h-8 text-sm" aria-label={t('settings.appTheme.title')}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={DEFAULT_THEME_VALUE}>{t(DEFAULT_THEME_LABEL_KEY)}</SelectItem>
						{customThemes.map((theme) => (
							<SelectItem key={theme.id} value={theme.id}>
								{theme.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</SettingRow>

			<SettingRow
				label={t('settings.language.title')}
				description={t('settings.language.description')}
			>
				<Select value={language} onValueChange={handleLanguageChange}>
					<SelectTrigger className="w-32 h-8 text-sm" aria-label={t('settings.language.title')}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{LANGUAGE_OPTIONS.map((option) => (
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

export default SystemPage;
