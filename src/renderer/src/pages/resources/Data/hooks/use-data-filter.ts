import { useMemo } from 'react';
import type { ResourceInfo } from '../../../../../../shared/types';
import type { SortDirection, SortKey } from '../types';
import { ALL_TYPES_VALUE } from '../types';

interface UseDataFilterParams {
	resources: ResourceInfo[];
	searchQuery: string;
	typeFilter: string;
	sortKey: SortKey;
	sortDirection: SortDirection;
}

export function useDataFilter({
	resources,
	searchQuery,
	typeFilter,
	sortKey,
	sortDirection,
}: UseDataFilterParams): ResourceInfo[] {
	return useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const result = resources.filter((r) => {
			if (typeFilter !== ALL_TYPES_VALUE && r.mimeType !== typeFilter) return false;
			if (query && !r.name.toLowerCase().includes(query)) return false;
			return true;
		});

		if (sortDirection !== 'none') {
			result.sort((a, b) => {
				let cmp: number;
				if (sortKey === 'name' || sortKey === 'mimeType') {
					cmp = a[sortKey].localeCompare(b[sortKey]);
				} else {
					cmp = a[sortKey] - b[sortKey];
				}
				return sortDirection === 'asc' ? cmp : -cmp;
			});
		}

		return result;
	}, [resources, searchQuery, typeFilter, sortDirection, sortKey]);
}
