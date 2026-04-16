import type { HoveredBlock } from './state';

export type EditorAction =
	| { type: 'SET_HOVERED_BLOCK'; payload: HoveredBlock | null }
	| { type: 'SET_IMAGE_DIALOG_OPEN'; payload: boolean };
