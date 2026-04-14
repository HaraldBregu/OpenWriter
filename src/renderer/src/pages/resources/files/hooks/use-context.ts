import { useContext as useReactContext } from 'react';
import { Context } from '../Context';
import type { FilesContextValue } from '../context/types';

export function useContext(): FilesContextValue {
	const context = useReactContext(Context);
	if (!context) {
		throw new Error('useContext must be used within a FilesProvider');
	}
	return context;
}
