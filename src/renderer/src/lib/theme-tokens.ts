import type { ThemeData } from '../../../shared/types';

const THEME_STYLE_STORAGE_KEY = 'app-theme-style';
const DEFAULT_THEME_ID = 'default';

const THEME_CSS_VARS: ReadonlyArray<{ variable: string; resolve: (d: ThemeData) => string }> = [
	{ variable: '--nav-background', resolve: (d) => d.nav.background },
	{ variable: '--nav-foreground', resolve: (d) => d.nav.foreground },
	{ variable: '--nav-title', resolve: (d) => d.nav.title },
	{ variable: '--page-background', resolve: (d) => d.page.background },
	{ variable: '--page-foreground', resolve: (d) => d.page.foreground },
	{ variable: '--page-title', resolve: (d) => d.page.title },
	{ variable: '--page-header-background', resolve: (d) => d.page.header.background },
	{ variable: '--page-header-foreground', resolve: (d) => d.page.header.foreground },
	{ variable: '--page-header-title', resolve: (d) => d.page.header.title },
	{ variable: '--sidebar-background', resolve: (d) => d.sidebar.background },
	{ variable: '--sidebar-foreground', resolve: (d) => d.sidebar.foreground },
	{ variable: '--sidebar-title', resolve: (d) => d.sidebar.title },
	{ variable: '--panel-background', resolve: (d) => d.panel.background },
	{ variable: '--panel-foreground', resolve: (d) => d.panel.foreground },
	{ variable: '--panel-header-background', resolve: (d) => d.panel.header.background },
	{ variable: '--panel-header-foreground', resolve: (d) => d.panel.header.foreground },
	{ variable: '--panel-header-title', resolve: (d) => d.panel.header.title },
	{ variable: '--panel-body-background', resolve: (d) => d.panel.body.background },
	{ variable: '--panel-body-foreground', resolve: (d) => d.panel.body.foreground },
	{ variable: '--panel-footer-background', resolve: (d) => d.panel.footer.background },
	{ variable: '--panel-footer-foreground', resolve: (d) => d.panel.footer.foreground },
	{ variable: '--panel-footer-title', resolve: (d) => d.panel.footer.title },
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
