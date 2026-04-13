import type { ThemeData } from '../../../shared/types';

const THEME_STYLE_STORAGE_KEY = 'app-theme-style';
const DEFAULT_THEME_ID = 'default';

const THEME_CSS_KEYS: ReadonlyArray<keyof ThemeData> = [
	'background',
	'foreground',
	'card',
	'card-foreground',
	'popover',
	'popover-foreground',
	'primary',
	'primary-foreground',
	'secondary',
	'secondary-foreground',
	'muted',
	'muted-foreground',
	'accent',
	'accent-foreground',
	'destructive',
	'destructive-foreground',
	'border',
	'input',
	'ring',
	'radius',
	'success',
	'success-foreground',
	'warning',
	'warning-foreground',
	'info',
	'info-foreground',
	'sidebar-background',
	'sidebar-foreground',
	'sidebar-primary',
	'sidebar-primary-foreground',
	'sidebar-accent',
	'sidebar-accent-foreground',
	'sidebar-border',
	'sidebar-ring',
];

export function applyThemeTokens(data: ThemeData): void {
	const root = document.documentElement;
	for (const key of THEME_CSS_KEYS) {
		root.style.setProperty(`--${key}`, data[key]);
	}
}

export function clearThemeTokens(): void {
	const root = document.documentElement;
	for (const key of THEME_CSS_KEYS) {
		root.style.removeProperty(`--${key}`);
	}
}

export function readPersistedThemeStyle(): string {
	try {
		return localStorage.getItem(THEME_STYLE_STORAGE_KEY) ?? DEFAULT_THEME_ID;
	} catch {
		return DEFAULT_THEME_ID;
	}
}

export function resolveEffectiveVariant(): 'light' | 'dark' {
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export { THEME_STYLE_STORAGE_KEY, DEFAULT_THEME_ID };
