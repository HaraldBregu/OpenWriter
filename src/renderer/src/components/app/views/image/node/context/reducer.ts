import type { ImageState } from './state';
import type { ImageAction } from './actions';

export function imageReducer(state: ImageState, action: ImageAction): ImageState {
	switch (action.type) {
		case 'SET_HOVERED':
			return { ...state, hovered: action.payload };
		case 'SET_FOCUSED':
			return { ...state, focused: action.payload };
		case 'SET_PREVIEWING':
			return { ...state, previewing: action.payload };
		case 'IMAGE_LOADED':
			return { ...state, loadError: false };
		case 'IMAGE_ERROR':
			return { ...state, loadError: true };
		case 'RESET_LOAD_ERROR':
			return { ...state, loadError: false };
		case 'START_AI_EDIT':
			return { ...state, editing: true, editInitialMode: 'ai' };
		case 'START_EDIT':
			return { ...state, editing: true, editInitialMode: undefined };
		case 'FINISH_EDIT':
			return { ...state, editing: false };
	}
}
