import type { FileEntry, FileTypeFilter, ViewMode } from './types';

export interface FilesReducerState {
	entries: FileEntry[];
	isLoading: boolean;
	uploading: boolean;
	searchQuery: string;
	viewMode: ViewMode;
	typeFilter: FileTypeFilter;
	confirmOpen: boolean;
	activeFile: FileEntry | null;
	fileDetailsOpen: boolean;
	editMode: boolean;
}

export const initialFilesState: FilesReducerState = {
	entries: [],
	isLoading: true,
	uploading: false,
	searchQuery: '',
	viewMode: 'list',
	typeFilter: 'all',
	confirmOpen: false,
	activeFile: null,
	fileDetailsOpen: false,
	editMode: false,
};
