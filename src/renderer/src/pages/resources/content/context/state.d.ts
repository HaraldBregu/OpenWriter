import type { ResourceInfo } from '../../../../../../shared/types';
export interface ContentState {
    contents: ResourceInfo[];
    isLoading: boolean;
    uploading: boolean;
    searchQuery: string;
    editing: boolean;
    confirmOpen: boolean;
    removing: boolean;
}
export declare const initialState: ContentState;
