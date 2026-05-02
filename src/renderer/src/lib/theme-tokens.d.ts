import type { ThemeData } from '../../../shared/types';
declare const THEME_STYLE_STORAGE_KEY = "app-theme-style";
declare const DEFAULT_THEME_ID = "default";
export declare function applyThemeTokens(data: ThemeData): void;
export declare function clearThemeTokens(): void;
export declare function readPersistedThemeStyle(): string;
export declare function resolveEffectiveVariant(): 'light' | 'dark';
export { THEME_STYLE_STORAGE_KEY, DEFAULT_THEME_ID };
