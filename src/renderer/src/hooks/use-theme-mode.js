import { useTheme } from './use-theme';
export function useThemeMode() {
    return useTheme().theme;
}
