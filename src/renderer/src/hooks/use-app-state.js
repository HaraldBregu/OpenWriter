import { useMemo } from 'react';
import { useTheme } from './use-theme';
import { useLanguageContext } from './use-language-context';
export function useAppState() {
    const { theme } = useTheme();
    const { language } = useLanguageContext();
    return useMemo(() => ({ theme, language }), [theme, language]);
}
