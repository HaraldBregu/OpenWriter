import { useContext } from 'react';
import { Context } from '../context/context';
import type { ContextValue } from '../context/context';

export function useContentGenerator(): ContextValue {
	const context = useContext(Context);
	if (!context) {
		throw new Error('useContentGenerator must be used within ContentGeneratorProvider');
	}
	return context;
}
