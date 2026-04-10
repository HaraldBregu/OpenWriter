import { useCallback, useState } from 'react';
import type { SortDirection, SortKey } from '../types';

function nextSortDirection(current: SortDirection): SortDirection {
	if (current === 'none') return 'asc';
	if (current === 'asc') return 'desc';
	return 'none';
}

interface UseDataSortReturn {
	sortKey: SortKey;
	sortDirection: SortDirection;
	handleSort: (key: SortKey) => void;
}

export function useDataSort(): UseDataSortReturn {
	const [sortKey, setSortKey] = useState<SortKey>('name');
	const [sortDirection, setSortDirection] = useState<SortDirection>('none');

	const handleSort = useCallback(
		(key: SortKey) => {
			if (key === sortKey) {
				setSortDirection((d) => nextSortDirection(d));
			} else {
				setSortKey(key);
				setSortDirection('asc');
			}
		},
		[sortKey]
	);

	return { sortKey, sortDirection, handleSort };
}
