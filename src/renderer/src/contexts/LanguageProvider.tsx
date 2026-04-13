import React, { createContext, useCallback, useMemo, useState, useEffect } from 'react';
import i18n from '../i18n';
import type { AppLanguage } from './AppContext';

const LANGUAGE_STORAGE_KEY = 'app-language';

export function readPersistedLanguage(): AppLanguage {
	try {
		const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
		if (stored === 'en' || stored === 'it') return stored;
	} catch {
		/* empty */
	}
	return 'en';
}

export interface LanguageContextValue {
	language: AppLanguage;
	setLanguage: (language: AppLanguage) => void;
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({
	children,
	initialLanguage,
}: {
	children: React.ReactNode;
	initialLanguage?: AppLanguage;
}) {
	const [language, setLanguageState] = useState<AppLanguage>(
		initialLanguage ?? readPersistedLanguage()
	);
	const setLanguage = useCallback((next: AppLanguage) => setLanguageState(next), []);

	useEffect(() => {
		i18n.changeLanguage(language);
		try {
			localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
		} catch {
			/* empty */
		}
		window.app?.setLanguage(language);
	}, [language]);

	useEffect(() => {
		if (!window.app?.onLanguageChange) return;
		return window.app.onLanguageChange((incoming: string) => {
			if (incoming === 'en' || incoming === 'it') {
				setLanguageState(incoming as AppLanguage);
			}
		});
	}, []);

	const value = useMemo<LanguageContextValue>(
		() => ({ language, setLanguage }),
		[language, setLanguage]
	);

	return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
