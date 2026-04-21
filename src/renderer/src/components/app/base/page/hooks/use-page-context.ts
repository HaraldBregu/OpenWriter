import { useContext } from 'react';
import { PageContext, type ContextValue } from '../context/context';

export function usePageContext(): ContextValue {
	const ctx = useContext(PageContext);
	if (!ctx) {
		throw new Error('usePageContext must be used within a Provider');
	}
	return ctx;
}
