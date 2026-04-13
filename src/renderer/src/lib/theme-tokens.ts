import type { ThemeData } from '../../../shared/types';

const THEME_STYLE_STORAGE_KEY = 'app-theme-style';
const DEFAULT_THEME_ID = 'default';

const THEME_CSS_VARS: ReadonlyArray<{ variable: string; resolve: (d: ThemeData) => string }> = [
	{ variable: '--title-bar-background', resolve: (d) => d.titleBar.background },
	{ variable: '--title-bar-foreground', resolve: (d) => d.titleBar.foreground },
	{ variable: '--title-bar-title', resolve: (d) => d.titleBar.title },
	{ variable: '--page-background', resolve: (d) => d.page.background },
	{ variable: '--page-foreground', resolve: (d) => d.page.foreground },
	{ variable: '--page-title', resolve: (d) => d.page.title },
	{ variable: '--page-header-background', resolve: (d) => d.page.header.background },
	{ variable: '--page-header-foreground', resolve: (d) => d.page.header.foreground },
	{ variable: '--page-header-title', resolve: (d) => d.page.header.title },
	{ variable: '--sidebar-custom-background', resolve: (d) => d.sidebar.background },
	{ variable: '--sidebar-custom-foreground', resolve: (d) => d.sidebar.foreground },
	{ variable: '--sidebar-custom-title', resolve: (d) => d.sidebar.title },
];

export function applyThemeTokens(data: ThemeData): void {
	const root = document.documentElement;
	for (const entry of THEME_CSS_VARS) {
		root.style.setProperty(entry.variable, entry.resolve(data));
	}
}

export function clearThemeTokens(): void {
	const root = document.documentElement;
	for (const entry of THEME_CSS_VARS) {
		root.style.removeProperty(entry.variable);
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
