import { useContext } from 'react';
import { FilesContext } from '../context/FilesContext';
import type { FilesContextValue } from '../context/types';

export function useFilesContext(): FilesContextValue {
	const context = useContext(FilesContext);
	if (!context) {
		throw new Error('useFilesContext must be used within a FilesProvider');
	}
	return context;
}
