import type { ThemeMode } from '../../../../shared/types';
import { useTheme } from './use-theme';

export function useThemeMode(): ThemeMode {
	return useTheme().theme;
}
