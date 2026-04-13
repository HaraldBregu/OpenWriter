import React, { useCallback, useEffect, useState } from 'react';
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
import type { ThemeMode, AppLanguage } from '../../../contexts';
import type { CustomThemeInfo } from '../../../../../shared/types';
import { useAppActions } from '@/hooks/use-app-actions';
import { useLanguageMode } from '@/hooks/use-language-mode';
import { useThemeMode } from '@/hooks/use-theme-mode';
import {
	applyThemeTokens,
	clearThemeTokens,
	resolveEffectiveVariant,
	THEME_STYLE_STORAGE_KEY,
	DEFAULT_THEME_ID,
} from '../../../lib/theme-tokens';

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

	const [customThemes, setCustomThemes] = useState<CustomThemeInfo[]>([]);
	const [activeThemeId, setActiveThemeId] = useState<string>(() => {
		try {
			return localStorage.getItem(THEME_STYLE_STORAGE_KEY) ?? DEFAULT_THEME_ID;
		} catch {
			return DEFAULT_THEME_ID;
		}
	});

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

	const handleThemeStyleChange = useCallback((next: string | null): void => {
		if (next === null) return;
		setActiveThemeId(next);
		try {
			localStorage.setItem(THEME_STYLE_STORAGE_KEY, next);
		} catch {
			/* empty */
		}
	}, []);

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
				<Select value={activeThemeId} onValueChange={handleThemeStyleChange}>
					<SelectTrigger className="w-32 h-8 text-sm" aria-label={t('settings.appTheme.title')}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={DEFAULT_THEME_ID}>
							{t('settings.appTheme.default')}
						</SelectItem>
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
