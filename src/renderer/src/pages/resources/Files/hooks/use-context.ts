import { useContext } from 'react';
import { Context } from '../context/Context';
import type { FilesContextValue } from '../context/types';

export function useFilesContext(): FilesContextValue {
	const context = useContext(Context);
	if (!context) {
		throw new Error('useFilesContext must be used within a FilesProvider');
	}
	return context;
}
