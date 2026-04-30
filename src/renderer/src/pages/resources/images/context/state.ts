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

export const initialFilesState: FilesReducerState = {
	uploading: false,
	searchQuery: '',
	viewMode: 'list',
	typeFilter: 'all',
	confirmOpen: false,
	activeFile: null,
	fileDetailsOpen: false,
	editMode: false,
};
