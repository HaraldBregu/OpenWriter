import { useContext } from 'react';
import { Context, ContextValue } from '../context';

export function usePrompt(): ContextValue {
	const context = useContext(Context);
	if (!context) {
		throw new Error('usePrompt must be used within PromptProvider');
	}
	return context;
}
