import type { FilesReducerState } from './state';
import type { FilesAction } from './actions';

export function filesReducer(state: FilesReducerState, action: FilesAction): FilesReducerState {
	switch (action.type) {
		case 'SET_ENTRIES':
			return { ...state, entries: action.payload };
		case 'SET_IS_LOADING':
			return { ...state, isLoading: action.payload };
		case 'SET_UPLOADING':
			return { ...state, uploading: action.payload };
		case 'SET_SEARCH_QUERY':
			return { ...state, searchQuery: action.payload };
		case 'SET_VIEW_MODE':
			return { ...state, viewMode: action.payload };
		case 'SET_TYPE_FILTER':
			return { ...state, typeFilter: action.payload };
		case 'SET_CONFIRM_OPEN':
			return { ...state, confirmOpen: action.payload };
		case 'OPEN_FILE_DETAILS':
			return { ...state, activeFile: action.payload, fileDetailsOpen: true };
		case 'CLOSE_FILE_DETAILS':
			return { ...state, activeFile: null, fileDetailsOpen: false };
		case 'TOGGLE_EDIT_MODE':
			return { ...state, editMode: !state.editMode };
		case 'DELETE_SUCCESS':
			return { ...state, confirmOpen: false };
		case 'RESET_ENTRIES':
			return { ...state, entries: [] };
		default:
			return state;
	}
}
