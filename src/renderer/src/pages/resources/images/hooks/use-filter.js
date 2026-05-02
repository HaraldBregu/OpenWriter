import { useMemo } from 'react';
import { matchesTypeFilter } from '../shared/file-utils';
export function useFilter({ entries, searchQuery, typeFilter, sortKey, sortDirection, }) {
    return useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const result = entries.filter((f) => {
            if (query && !f.name.toLowerCase().includes(query))
                return false;
            return matchesTypeFilter(f.mimeType, typeFilter);
        });
        if (sortDirection !== 'none') {
            result.sort((a, b) => {
                let cmp;
                if (sortKey === 'name' || sortKey === 'mimeType') {
                    cmp = a[sortKey].localeCompare(b[sortKey]);
                }
                else {
                    cmp = a[sortKey] - b[sortKey];
                }
                return sortDirection === 'asc' ? cmp : -cmp;
            });
        }
        return result;
    }, [entries, searchQuery, sortDirection, sortKey, typeFilter]);
}
