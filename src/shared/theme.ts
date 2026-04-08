import type { ThemeMode, ThemeTokens, ThemeVariant } from './types';

export const THEME_VARIANTS = ['light', 'dark'] as const satisfies readonly ThemeVariant[];
export const THEME_MODES = ['light', 'dark', 'system'] as const satisfies readonly ThemeMode[];
export const DEFAULT_THEME_MODE: ThemeMode = 'system';

export const LIGHT_THEME: ThemeTokens = {
	colorScheme: 'light',
	background: '0 0% 97%',
	foreground: '0 0% 8%',
	card: '0 0% 100%',
	cardForeground: '0 0% 8%',
	popover: '0 0% 100%',
	popoverForeground: '0 0% 8%',
	primary: '0 0% 9%',
	primaryForeground: '0 0% 98%',
	secondary: '0 0% 93%',
	secondaryForeground: '0 0% 10%',
	muted: '0 0% 95%',
	mutedForeground: '0 0% 38%',
	accent: '0 0% 92%',
	accentForeground: '0 0% 10%',
	destructive: '0 74% 54%',
	destructiveForeground: '0 0% 98%',
	border: '0 0% 87%',
	input: '0 0% 87%',
	ring: '0 0% 18%',
	radius: '0.5rem',
	success: '148 64% 40%',
	successForeground: '0 0% 98%',
	warning: '34 92% 44%',
	warningForeground: '25 95% 12%',
	info: '215 70% 48%',
	infoForeground: '0 0% 98%',
	sidebarBackground: '0 0% 95%',
	sidebarForeground: '0 0% 14%',
	sidebarPrimary: '0 0% 9%',
	sidebarPrimaryForeground: '0 0% 98%',
	sidebarAccent: '0 0% 91%',
	sidebarAccentForeground: '0 0% 10%',
	sidebarBorder: '0 0% 86%',
	sidebarRing: '0 0% 18%',
};

export const DARK_THEME: ThemeTokens = {
	colorScheme: 'dark',
	background: '220 5% 8%',
	foreground: '30 14% 86%',
	card: '24 6% 13%',
	cardForeground: '30 14% 86%',
	popover: '24 6% 13%',
	popoverForeground: '30 14% 86%',
	primary: '23 45% 52%',
	primaryForeground: '24 18% 10%',
	secondary: '24 5% 16%',
	secondaryForeground: '30 12% 84%',
	muted: '24 5% 16%',
	mutedForeground: '28 10% 67%',
	accent: '24 9% 19%',
	accentForeground: '30 14% 86%',
	destructive: '0 72% 61%',
	destructiveForeground: '0 0% 98%',
	border: '24 6% 22%',
	input: '24 6% 22%',
	ring: '23 32% 58%',
	radius: '0.5rem',
	success: '148 42% 52%',
	successForeground: '148 28% 10%',
	warning: '30 72% 60%',
	warningForeground: '28 40% 12%',
	info: '205 46% 63%',
	infoForeground: '210 40% 10%',
	sidebarBackground: '220 5% 9%',
	sidebarForeground: '30 14% 84%',
	sidebarPrimary: '23 45% 52%',
	sidebarPrimaryForeground: '24 18% 10%',
	sidebarAccent: '24 7% 16%',
	sidebarAccentForeground: '30 14% 86%',
	sidebarBorder: '24 6% 18%',
	sidebarRing: '23 32% 58%',
};

export const THEMES: Record<ThemeVariant, ThemeTokens> = {
	light: LIGHT_THEME,
	dark: DARK_THEME,
};

export function isThemeMode(value: string): value is ThemeMode {
	return (THEME_MODES as readonly string[]).includes(value);
}
