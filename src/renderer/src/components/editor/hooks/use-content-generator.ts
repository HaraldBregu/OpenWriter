import { useContext } from 'react';
import { ContentGeneratorContext } from '../../app/views/prompt/context/context';
import type { ContentGeneratorContextValue } from '../../app/views/prompt/context/context';

export function useContentGenerator(): ContentGeneratorContextValue {
	const context = useContext(ContentGeneratorContext);
	if (!context) {
		throw new Error('useContentGenerator must be used within ContentGeneratorProvider');
	}
	return context;
}
