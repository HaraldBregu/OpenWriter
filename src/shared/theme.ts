import type { ThemeData, ThemeMode, ThemeVariant } from './types';

export const THEME_VARIANTS = ['light', 'dark'] as const satisfies readonly ThemeVariant[];
export const THEME_MODES = ['light', 'dark', 'system'] as const satisfies readonly ThemeMode[];
export const DEFAULT_THEME_MODE: ThemeMode = 'system';

export const LIGHT_THEME: ThemeData = {
	background: '#f7f7f7',
	foreground: '#141414',
	text: '#171717',
	icon: '#616161',
	titleBar: {
		background: '#f2f2f2',
		foreground: '#242424',
		text: '#171717',
		icon: '#616161',
	},
};

export const DARK_THEME: ThemeData = {
	background: '#141518',
	foreground: '#d9d1c7',
	text: '#d9d1c7',
	icon: '#a69e93',
	titleBar: {
		background: '#151618',
		foreground: '#d4ccc2',
		text: '#d9d1c7',
		icon: '#a69e93',
	},
};

export const THEMES: Record<ThemeVariant, ThemeData> = {
	light: LIGHT_THEME,
	dark: DARK_THEME,
};

export function isThemeMode(value: string): value is ThemeMode {
	return (THEME_MODES as readonly string[]).includes(value);
}
