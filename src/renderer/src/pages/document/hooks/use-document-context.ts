import { useContext } from 'react';
import { DocumentContext, type ContextValue } from '../context/context';

export function useDocumentContext(): ContextValue {
	const ctx = useContext(DocumentContext);
	if (!ctx) {
		throw new Error('useDocumentContext must be used within a Provider');
	}
	return ctx;
}
