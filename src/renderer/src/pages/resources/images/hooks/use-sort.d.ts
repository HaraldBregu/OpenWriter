import type { FilesSortDirection as SortDirection, FilesSortKey as SortKey } from '../../../../../../shared/types';
interface UseSortReturn {
    sortKey: SortKey;
    sortDirection: SortDirection;
    handleSort: (key: SortKey) => void;
}
export declare function useSort(): UseSortReturn;
export {};
