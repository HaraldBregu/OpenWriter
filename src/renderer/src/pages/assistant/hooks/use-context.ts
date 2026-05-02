import { useContext as useReactContext } from 'react';
import { AssistantContext, type ContextValue } from '../context/context';

export function useContext(): ContextValue {
	const ctx = useReactContext(AssistantContext);
	if (!ctx) {
		throw new Error('useContext must be used within a Provider');
	}
	return ctx;
}
