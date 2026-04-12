import type { FileEntry, FileTypeFilter, ViewMode } from './types';

export type FilesAction =
	| { type: 'SET_ENTRIES'; payload: FileEntry[] }
	| { type: 'SET_IS_LOADING'; payload: boolean }
	| { type: 'SET_UPLOADING'; payload: boolean }
	| { type: 'SET_SEARCH_QUERY'; payload: string }
	| { type: 'SET_VIEW_MODE'; payload: ViewMode }
	| { type: 'SET_TYPE_FILTER'; payload: FileTypeFilter }
	| { type: 'SET_CONFIRM_OPEN'; payload: boolean }
	| { type: 'OPEN_FILE_DETAILS'; payload: FileEntry }
	| { type: 'CLOSE_FILE_DETAILS' }
	| { type: 'TOGGLE_EDIT_MODE' }
	| { type: 'ADD_ENTRIES'; payload: FileEntry[] }
	| { type: 'REMOVE_ENTRY'; payload: string }
	| { type: 'REMOVE_ENTRIES'; payload: string[] }
	| { type: 'DELETE_SUCCESS' }
	| { type: 'RESET_ENTRIES' };
