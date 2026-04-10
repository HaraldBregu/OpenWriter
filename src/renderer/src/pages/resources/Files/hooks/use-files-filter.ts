import { useMemo } from 'react';
import type { FileEntry } from '../../../../../../shared/types';
import type { FileTypeFilter, SortDirection, SortKey } from '../types';
import { MIME_TYPE_JSON, MIME_TYPE_PDF } from '../../shared/resource-preview-utils';

const MIME_TYPE_MARKDOWN = 'text/markdown';
const MIME_TYPE_TEXT = 'text/plain';

function matchesTypeFilter(mimeType: string, filter: FileTypeFilter): boolean {
	switch (filter) {
		case 'json':
			return mimeType === MIME_TYPE_JSON;
		case 'markdown':
			return mimeType === MIME_TYPE_MARKDOWN;
		case 'text':
			return mimeType === MIME_TYPE_TEXT;
		case 'pdf':
			return mimeType === MIME_TYPE_PDF;
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
