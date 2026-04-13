import { useContext } from 'react';
import { LanguageContext } from '../LanguageProvider';
import type { LanguageContextValue } from '../LanguageProvider';

export function useLanguageContext(): LanguageContextValue {
	const ctx = useContext(LanguageContext);
	if (ctx === undefined) throw new Error('useLanguageContext must be used within an AppProvider');
	return ctx;
}
