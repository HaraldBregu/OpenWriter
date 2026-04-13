import { useContext } from 'react';
import { ThemeContext } from '../ThemeProvider';
import type { ThemeContextValue } from '../ThemeProvider';

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (ctx === undefined) throw new Error('useTheme must be used within an AppProvider');
	return ctx;
}
