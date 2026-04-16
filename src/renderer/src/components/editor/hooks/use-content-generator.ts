import { useContext } from 'react';
import { ContentGeneratorContext } from '../context/context';
import type { ContentGeneratorContextValue } from '../context/context';

export function useContentGenerator(): ContentGeneratorContextValue {
	const context = useContext(ContentGeneratorContext);
	if (!context) {
		throw new Error('useContentGenerator must be used within ContentGeneratorProvider');
	}
	return context;
}
