import type { EditorState } from './state';
import type { EditorAction } from './actions';

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
	switch (action.type) {
		case 'SET_HOVERED_BLOCK':
			return { ...state, hoveredBlock: action.payload };
		case 'SET_IMAGE_DIALOG_OPEN':
			return { ...state, imageDialogOpen: action.payload };
	}
}
