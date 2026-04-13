import type { ContentGeneratorState } from './state';
import type { ContentGeneratorAction } from './actions';

export function contentGeneratorReducer(
	state: ContentGeneratorState,
	action: ContentGeneratorAction
): ContentGeneratorState {
	switch (action.type) {
		case 'SET_PROMPT':
			return { ...state, prompt: action.payload };
		case 'ADD_FILE':
			return { ...state, files: [...state.files, action.payload] };
		case 'ADD_PREVIEW_URL':
			return { ...state, previewUrls: [...state.previewUrls, action.payload] };
		case 'REMOVE_FILE':
			return {
				...state,
				files: state.files.filter((_, i) => i !== action.payload),
				previewUrls: state.previewUrls.filter((_, i) => i !== action.payload),
			};
		case 'SET_DRAG_OVER':
			return { ...state, isDragOver: action.payload };
		case 'SET_IMAGE_MODEL':
			return { ...state, selectedImageModel: action.payload };
		case 'SET_TEXT_MODEL':
			return { ...state, selectedTextModel: action.payload };
	}
}
