import type { ReactElement, ReactNode } from 'react';
import type { ResourceInfo } from '../../../../../shared/types';
import type { SortDirection, SortKey } from './shared/types';
export interface ContentContextValue {
    contents: ResourceInfo[];
    setContents: (contents: ResourceInfo[]) => void;
    filteredContents: ResourceInfo[];
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    uploading: boolean;
    editing: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    sortKey: SortKey;
    sortDirection: SortDirection;
    handleSort: (key: SortKey) => void;
    selected: Set<string>;
    allChecked: boolean;
    someChecked: boolean;
    handleToggleAll: () => void;
    handleToggleRow: (id: string) => void;
    handleUpload: (extensions?: string[]) => void;
    handleToggleEdit: () => void;
    handleOpenResourcesFolder: () => void;
    handleDelete: () => void;
    handleDeleteOne: (id: string) => void;
    handleDeleteMany: (ids: string[]) => void;
    refreshContents: () => Promise<void>;
    handleConfirmDelete: () => Promise<void>;
    confirmOpen: boolean;
    setConfirmOpen: (open: boolean) => void;
    removing: boolean;
}
export declare function useContentContext(): ContentContextValue;
interface ContentProviderProps {
    readonly children: ReactNode;
}
export declare function ContentProvider({ children }: ContentProviderProps): ReactElement;
export {};
