import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
	AppSelect,
	AppSelectTrigger,
	AppSelectValue,
	AppSelectContent,
	AppSelectItem,
} from '@/components/app';
import { SectionHeader, SettingRow } from './SettingsComponents';
import { useThemeMode, useLanguageMode, useAppActions } from '../../contexts';
import type { ThemeMode, AppLanguage } from '../../contexts';

// ---------------------------------------------------------------------------
// Theme segment control
// ---------------------------------------------------------------------------

interface ThemeOption {
	readonly value: ThemeMode;
	readonly labelKey: string;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
	{ value: 'light', labelKey: 'settings.theme.light' },
	{ value: 'dark', labelKey: 'settings.theme.dark' },
	{ value: 'system', labelKey: 'settings.theme.system' },
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
				const isFirst = index === 0;
				const isLast = index === THEME_OPTIONS.length - 1;

				return (
					<button
						key={option.value}
						type="button"
						aria-pressed={isActive}
						onClick={() => onChange(option.value)}
						className={cn(
							'relative px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
							isFirst && 'rounded-l-sm',
							isLast && 'rounded-r-sm',
							!isFirst && !isLast && 'rounded-none',
							isActive
								? 'bg-background text-foreground shadow-sm'
								: 'bg-transparent text-muted-foreground hover:text-foreground'
						)}
					>
						{t(option.labelKey)}
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
// Page
// ---------------------------------------------------------------------------

const SystemSettingsPage: React.FC = () => {
	const { t } = useTranslation();
	const themeMode = useThemeMode();
	const language = useLanguageMode();
	const { setTheme, setLanguage } = useAppActions();

	const handleThemeChange = (next: ThemeMode): void => {
		setTheme(next);
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
