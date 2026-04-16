import type { PixelCrop } from 'react-image-crop';
import type { EditMode } from './state';

export type ImageEditorAction =
	| { type: 'SET_ACTIVE_MODE'; payload: EditMode | null }
	| { type: 'SET_PROCESSING_AI'; payload: boolean }
	| { type: 'SET_AI_PROMPT'; payload: string }
	| { type: 'ADD_AI_FILE'; payload: { file: File; url: string } }
	| { type: 'REMOVE_AI_FILE'; payload: number }
	| { type: 'CLEAR_AI' }
	| { type: 'SET_DRAG_OVER'; payload: boolean }
	| { type: 'SET_SELECTED_MODEL'; payload: string }
	| { type: 'SET_CROP'; payload: PixelCrop | undefined };
