import { useContext as useReactContext } from 'react';
import { Context } from '../Context';
import type { DataContextValue } from '../context/types';

export function useContext(): DataContextValue {
	const context = useReactContext(Context);
	if (!context) {
		throw new Error('useContext must be used within a DataProvider');
	}
	return context;
}
