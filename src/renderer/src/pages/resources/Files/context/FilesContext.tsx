import { createContext, useContext } from 'react';
import type { FilesContextValue } from './types';

export const FilesContext = createContext<FilesContextValue | null>(null);

export function useFilesContext(): FilesContextValue {
	const context = useContext(FilesContext);
	if (!context) {
		throw new Error('useFilesContext must be used within a FilesProvider');
	}
	return context;
}
