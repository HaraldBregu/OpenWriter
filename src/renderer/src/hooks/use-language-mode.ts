import type { AppLanguage } from '../contexts/AppContext';
import { useLanguageContext } from './use-language-context';

export function useLanguageMode(): AppLanguage {
	return useLanguageContext().language;
}
