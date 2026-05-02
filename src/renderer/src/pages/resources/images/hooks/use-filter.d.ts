import type { FileEntry, FileTypeFilter, FilesSortDirection as SortDirection, FilesSortKey as SortKey } from '../../../../../../shared/types';
interface UseFilterParams {
    entries: FileEntry[];
    searchQuery: string;
    typeFilter: FileTypeFilter;
    sortKey: SortKey;
    sortDirection: SortDirection;
}
export declare function useFilter({ entries, searchQuery, typeFilter, sortKey, sortDirection, }: UseFilterParams): FileEntry[];
export {};
