import type { ThemeData, ThemeMode, ThemeVariant } from './types';

export const THEME_VARIANTS = ['light', 'dark'] as const satisfies readonly ThemeVariant[];
export const THEME_MODES = ['light', 'dark', 'system'] as const satisfies readonly ThemeMode[];
export const DEFAULT_THEME_MODE: ThemeMode = 'system';

export const LIGHT_THEME: ThemeData = {
	background: '#f7f7f7',
	foreground: '#141414',
	titleBar: {
		background: '#f2f2f2',
		foreground: '#242424',
		title: '#171717',
		sidebarIcon: '#616161',
		historyIcon: '#616161',
	},
	page: {
		background: '#ffffff',
		foreground: '#141414',
		title: '#171717',
		header: {
			background: '#f7f7f7',
			foreground: '#242424',
			title: '#171717',
		},
	},
	sidebar: {
		background: '#f2f2f2',
		foreground: '#242424',
		title: '#171717',
	},
};

export const DARK_THEME: ThemeData = {
	background: '#141518',
	foreground: '#d9d1c7',
	titleBar: {
		background: '#151618',
		foreground: '#d4ccc2',
		title: '#d9d1c7',
		sidebarIcon: '#a69e93',
		historyIcon: '#a69e93',
	},
	page: {
		background: '#1a1b1e',
		foreground: '#d9d1c7',
		title: '#e2dbd2',
		header: {
			background: '#141518',
			foreground: '#d4ccc2',
			title: '#d9d1c7',
		},
	},
	sidebar: {
		background: '#151618',
		foreground: '#d4ccc2',
		title: '#d9d1c7',
	},
};

export const THEMES: Record<ThemeVariant, ThemeData> = {
	light: LIGHT_THEME,
	dark: DARK_THEME,
};

export function isThemeMode(value: string): value is ThemeMode {
	return (THEME_MODES as readonly string[]).includes(value);
}
