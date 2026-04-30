import { useMemo } from 'react';
import type { ResourceInfo } from '../../../../../../shared/types';
import type { SortDirection, SortKey } from '../shared/types';

interface UseFilterParams {
	contents: ResourceInfo[];
	searchQuery: string;
	sortKey: SortKey;
	sortDirection: SortDirection;
}

export function useFilter({
	contents,
	searchQuery,
	sortKey,
	sortDirection,
}: UseFilterParams): ResourceInfo[] {
	return useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const result = contents.filter((item) => {
			if (query && !item.name.toLowerCase().includes(query)) return false;
			return true;
		});

		if (sortDirection !== 'none') {
			result.sort((a, b) => {
				let cmp: number;
				if (sortKey === 'name') {
					cmp = a.name.localeCompare(b.name);
				} else {
					cmp = a[sortKey] - b[sortKey];
				}
				return sortDirection === 'asc' ? cmp : -cmp;
			});
		}

		return result;
	}, [contents, searchQuery, sortDirection, sortKey]);
}
