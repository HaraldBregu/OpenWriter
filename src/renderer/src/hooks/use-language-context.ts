import { useContext } from 'react';
import { LanguageContext } from '../contexts/LanguageProvider';
import type { LanguageContextValue } from '../contexts/LanguageProvider';

export function useLanguageContext(): LanguageContextValue {
	const ctx = useContext(LanguageContext);
	if (ctx === undefined) throw new Error('useLanguageContext must be used within an AppProvider');
	return ctx;
}
