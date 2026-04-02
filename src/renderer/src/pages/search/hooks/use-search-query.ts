import { startTransition, useDeferredValue, useState } from 'react';

export function useSearchQuery(initialValue = '') {
	const [query, setInternalQuery] = useState(initialValue);
	const deferredQuery = useDeferredValue(query);

	const setQuery = (value: string): void => {
		startTransition(() => {
			setInternalQuery(value);
		});
	};

	const clearQuery = (): void => {
		setInternalQuery('');
	};

	return {
		query,
		deferredQuery,
		hasQuery: query.trim().length > 0,
		setQuery,
		clearQuery,
	};
}
