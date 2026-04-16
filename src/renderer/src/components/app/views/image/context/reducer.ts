import type { ImageEditorState } from './state';
import type { ImageEditorAction } from './actions';

export function imageEditorReducer(
	state: ImageEditorState,
	action: ImageEditorAction
): ImageEditorState {
	switch (action.type) {
		case 'SET_ACTIVE_MODE':
			return { ...state, activeMode: action.payload };
		case 'SET_PROCESSING_AI':
			return { ...state, isProcessingAI: action.payload };
		case 'SET_AI_PROMPT':
			return { ...state, aiPrompt: action.payload };
		case 'ADD_AI_FILE':
			return {
				...state,
				aiFiles: [...state.aiFiles, action.payload.file],
				aiPreviewUrls: [...state.aiPreviewUrls, action.payload.url],
			};
		case 'REMOVE_AI_FILE':
			return {
				...state,
				aiFiles: state.aiFiles.filter((_, i) => i !== action.payload),
				aiPreviewUrls: state.aiPreviewUrls.filter((_, i) => i !== action.payload),
			};
		case 'CLEAR_AI':
			return { ...state, aiPrompt: '', aiFiles: [], aiPreviewUrls: [] };
		case 'SET_DRAG_OVER':
			return { ...state, isDragOver: action.payload };
		case 'SET_SELECTED_MODEL':
			return { ...state, selectedModelId: action.payload };
		case 'SET_CROP':
			return { ...state, crop: action.payload };
	}
}
