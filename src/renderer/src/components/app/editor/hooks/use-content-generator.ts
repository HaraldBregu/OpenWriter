import { useContext } from 'react';
import { ContentGeneratorContext, ContentGeneratorContextValue } from '../../views/prompt/context';

export function useContentGenerator(): ContentGeneratorContextValue {
	const context = useContext(ContentGeneratorContext);
	if (!context) {
		throw new Error('useContentGenerator must be used within ContentGeneratorProvider');
	}
	return context;
}
