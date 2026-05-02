import type { FileEntry, FileTypeFilter, ViewMode } from './types';
export interface FilesReducerState {
    uploading: boolean;
    searchQuery: string;
    viewMode: ViewMode;
    typeFilter: FileTypeFilter;
    confirmOpen: boolean;
    activeFile: FileEntry | null;
    fileDetailsOpen: boolean;
    editMode: boolean;
}
export declare const initialFilesState: FilesReducerState;
