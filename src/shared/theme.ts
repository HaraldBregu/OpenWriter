import type { ThemeData, ThemeMode, ThemeVariant } from './types';

export const THEME_VARIANTS = ['light', 'dark'] as const satisfies readonly ThemeVariant[];
export const THEME_MODES = ['light', 'dark', 'system'] as const satisfies readonly ThemeMode[];
export const DEFAULT_THEME_MODE: ThemeMode = 'system';

export const LIGHT_THEME: ThemeTokens = {
	background: '0 0% 97%',
	foreground: '0 0% 8%',
	text: '0 0% 9%',
	icon: '0 0% 38%',
	titleBar: {
		background: '0 0% 95%',
		foreground: '0 0% 14%',
		text: '0 0% 9%',
		icon: '0 0% 38%',
	},
};

export const DARK_THEME: ThemeTokens = {
	background: '220 5% 8%',
	foreground: '30 14% 86%',
	text: '30 14% 86%',
	icon: '28 10% 67%',
	titleBar: {
		background: '220 5% 9%',
		foreground: '30 14% 84%',
		text: '30 14% 86%',
		icon: '28 10% 67%',
	},
};

export const THEMES: Record<ThemeVariant, ThemeTokens> = {
	light: LIGHT_THEME,
	dark: DARK_THEME,
};

export function isThemeMode(value: string): value is ThemeMode {
	return (THEME_MODES as readonly string[]).includes(value);
}
