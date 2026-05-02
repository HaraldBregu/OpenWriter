import type { ResourceInfo } from '../../../../../../shared/types';
import type { SortDirection, SortKey } from '../shared/types';
interface UseFilterParams {
    contents: ResourceInfo[];
    searchQuery: string;
    sortKey: SortKey;
    sortDirection: SortDirection;
}
export declare function useFilter({ contents, searchQuery, sortKey, sortDirection, }: UseFilterParams): ResourceInfo[];
export {};
