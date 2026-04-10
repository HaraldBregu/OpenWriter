import { useMemo } from 'react';
import type { FileEntry } from '../../../../../../shared/types';
import type { FileTypeFilter, SortDirection, SortKey } from '../types';
import {
	MIME_PREFIX_IMAGE,
	MIME_TYPE_JSON,
	MIME_TYPE_PDF,
} from '../../shared/resource-preview-utils';

function matchesTypeFilter(mimeType: string, filter: FileTypeFilter): boolean {
	switch (filter) {
		case 'image':
			return mimeType.startsWith(MIME_PREFIX_IMAGE);
		case 'pdf':
			return mimeType === MIME_TYPE_PDF;
		case 'json':
			return mimeType === MIME_TYPE_JSON;
		default:
			return true;
	}
}

interface UseFilesFilterParams {
	entries: FileEntry[];
	searchQuery: string;
	typeFilter: FileTypeFilter;
	sortKey: SortKey;
	sortDirection: SortDirection;
}

export function useFilesFilter({
	entries,
	searchQuery,
	typeFilter,
	sortKey,
	sortDirection,
}: UseFilesFilterParams): FileEntry[] {
	return useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const result = entries.filter((f) => {
			if (query && !f.name.toLowerCase().includes(query)) return false;
			return matchesTypeFilter(f.mimeType, typeFilter);
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
	}, [entries, searchQuery, sortDirection, sortKey, typeFilter]);
}
