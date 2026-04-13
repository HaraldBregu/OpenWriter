import type { AppLanguage } from '../AppContext';
import { useLanguageContext } from './use-language';

export function useLanguageMode(): AppLanguage {
	return useLanguageContext().language;
}
