import { useContext as useReactContext } from 'react';
import { DocumentContext, type ContextValue } from '../context/context';

export function useContext(): ContextValue {
	const ctx = useReactContext(DocumentContext);
	if (!ctx) {
		throw new Error('useContext must be used within a Provider');
	}
	return ctx;
}
