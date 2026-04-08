import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Monitor, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	AppSelect,
	AppSelectTrigger,
	AppSelectValue,
	AppSelectContent,
	AppSelectItem,
} from '@/components/app';
import { SectionHeader, SettingRow } from './SettingsComponents';
import { useThemeMode, useAppTheme, useLanguageMode, useAppActions } from '../../contexts';
import type { ThemeMode, AppTheme, AppLanguage } from '../../contexts';

// ---------------------------------------------------------------------------
// Theme segment control
// ---------------------------------------------------------------------------

interface ThemeOption {
	readonly value: ThemeMode;
	readonly icon: React.ElementType;
	readonly labelKey: string;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
	{ value: 'light', icon: Sun, labelKey: 'settings.theme.light' },
	{ value: 'system', icon: Monitor, labelKey: 'settings.theme.system' },
	{ value: 'dark', icon: Moon, labelKey: 'settings.theme.dark' },
] as const;

interface ThemeSegmentControlProps {
	readonly value: ThemeMode;
	readonly onChange: (next: ThemeMode) => void;
	readonly groupLabel: string;
}

const ThemeSegmentControl: React.FC<ThemeSegmentControlProps> = ({
	value,
	onChange,
	groupLabel,
}) => {
	const { t } = useTranslation();

	return (
		<div
			role="group"
			aria-label={groupLabel}
			className="inline-flex rounded-md border border-border bg-muted p-0.5"
		>
			{THEME_OPTIONS.map((option, index) => {
				const isActive = value === option.value;
				const Icon = option.icon;
				const isFirst = index === 0;
				const isLast = index === THEME_OPTIONS.length - 1;

				return (
					<button
						key={option.value}
						type="button"
						aria-pressed={isActive}
						aria-label={t(option.labelKey)}
						onClick={() => onChange(option.value)}
						className={cn(
							'relative p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
							isFirst && 'rounded-l-sm',
							isLast && 'rounded-r-sm',
							!isFirst && !isLast && 'rounded-none',
							isActive
								? 'bg-background text-foreground shadow-sm'
								: 'bg-transparent text-muted-foreground hover:text-foreground'
						)}
					>
						<Icon size={16} />
					</button>
				);
			})}
		</div>
	);
};

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

const SystemSettingsPage: React.FC = () => {
	const { t } = useTranslation();
	const themeMode = useThemeMode();
	const appTheme = useAppTheme();
	const language = useLanguageMode();
	const { setTheme, setAppTheme, setLanguage } = useAppActions();

	const handleThemeChange = (next: ThemeMode): void => {
		setTheme(next);
	};

	const handleAppThemeChange = (next: string): void => {
		setAppTheme(next as AppTheme);
	};

	const handleLanguageChange = (next: string): void => {
		if (next === 'en' || next === 'it') {
			setLanguage(next);
		}
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
