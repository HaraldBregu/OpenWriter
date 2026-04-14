import { useMemo } from 'react';
import type { FolderEntry } from '../../../../../../shared/types';
import type { SortDirection, SortKey } from '../shared/types';

interface UseFilterParams {
	folders: FolderEntry[];
	searchQuery: string;
	sortKey: SortKey;
	sortDirection: SortDirection;
}

export function useFilter({
	folders,
	searchQuery,
	sortKey,
	sortDirection,
}: UseFilterParams): FolderEntry[] {
	return useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const result = folders.filter((folder) => {
			if (query && !folder.name.toLowerCase().includes(query)) return false;
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
	}, [folders, searchQuery, sortDirection, sortKey]);
}
