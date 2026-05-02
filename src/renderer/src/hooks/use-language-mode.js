import { useLanguageContext } from './use-language-context';
export function useLanguageMode() {
    return useLanguageContext().language;
}
