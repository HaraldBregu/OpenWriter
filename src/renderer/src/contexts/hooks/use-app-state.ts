import { useMemo } from 'react';
import { useTheme } from './use-theme';
import { useLanguageContext } from './use-language';
import type { AppState } from '../AppContext';

export function useAppState(): AppState {
	const { theme } = useTheme();
	const { language } = useLanguageContext();
	return useMemo(() => ({ theme, language }), [theme, language]);
}
