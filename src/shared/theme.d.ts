import type { ThemeData, ThemeMode, ThemeVariant } from './types';
export declare const THEME_VARIANTS: readonly ["light", "dark"];
export declare const THEME_MODES: readonly ["light", "dark", "system"];
export declare const DEFAULT_THEME_MODE: ThemeMode;
export declare const LIGHT_THEME: ThemeData;
export declare const DARK_THEME: ThemeData;
export declare const THEMES: Record<ThemeVariant, ThemeData>;
export declare function isThemeMode(value: string): value is ThemeMode;
