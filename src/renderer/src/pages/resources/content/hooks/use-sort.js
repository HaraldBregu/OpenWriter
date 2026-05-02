import { useCallback, useState } from 'react';
function nextSortDirection(current) {
    if (current === 'none')
        return 'asc';
    if (current === 'asc')
        return 'desc';
    return 'none';
}
export function useSort() {
    const [sortKey, setSortKey] = useState('name');
    const [sortDirection, setSortDirection] = useState('none');
    const handleSort = useCallback((key) => {
        if (key === sortKey) {
            setSortDirection((d) => nextSortDirection(d));
        }
        else {
            setSortKey(key);
            setSortDirection('asc');
        }
    }, [sortKey]);
    return { sortKey, sortDirection, handleSort };
}
