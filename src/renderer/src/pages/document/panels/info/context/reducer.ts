import type { InfoAction } from './actions';
import type { InfoState } from './state';

export function infoReducer(state: InfoState, action: InfoAction): InfoState {
	switch (action.type) {
		case 'DOCUMENT_CONFIG_LOADED':
			return { ...state, documentConfig: action.config };
		case 'CONFIRM_DELETE_OPEN_CHANGED':
			return { ...state, confirmDeleteOpen: action.open };
		case 'DELETE_STARTED':
			return { ...state, isDeleting: true };
		case 'DELETE_FINISHED':
			return { ...state, isDeleting: false, confirmDeleteOpen: false };
		case 'IMAGE_PREVIEW_OPENED':
			return { ...state, previewImage: { src: action.src, alt: action.alt } };
		case 'IMAGE_PREVIEW_CLOSED':
			return { ...state, previewImage: null };
		default: {
			const _exhaustive: never = action;
			return _exhaustive;
		}
	}
}
