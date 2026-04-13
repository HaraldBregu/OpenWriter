export type ImageAction =
	| { type: 'SET_HOVERED'; payload: boolean }
	| { type: 'SET_FOCUSED'; payload: boolean }
	| { type: 'SET_PREVIEWING'; payload: boolean }
	| { type: 'IMAGE_LOADED' }
	| { type: 'IMAGE_ERROR' }
	| { type: 'RESET_LOAD_ERROR' }
	| { type: 'START_AI_EDIT' }
	| { type: 'START_EDIT' }
	| { type: 'FINISH_EDIT' };
