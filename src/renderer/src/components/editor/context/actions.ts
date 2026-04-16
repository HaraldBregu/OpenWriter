import type { HoveredBlock } from './state';
import type { ModelInfo } from '../../../../../shared/types';
import type { ContentGeneratorAgentId } from '../components/content_generator/agents';

export type EditorAction =
	| { type: 'SET_HOVERED_BLOCK'; payload: HoveredBlock | null }
	| { type: 'SET_IMAGE_DIALOG_OPEN'; payload: boolean };

export type ContentGeneratorAction =
	| { type: 'SET_PROMPT'; payload: string }
	| { type: 'SET_AGENT'; payload: ContentGeneratorAgentId }
	| { type: 'ADD_FILE'; payload: File }
	| { type: 'ADD_PREVIEW_URL'; payload: string }
	| { type: 'REMOVE_FILE'; payload: number }
	| { type: 'SET_FILES'; payload: File[] }
	| { type: 'SET_DRAG_OVER'; payload: boolean }
	| { type: 'SET_IMAGE_MODEL'; payload: ModelInfo }
	| { type: 'SET_TEXT_MODEL'; payload: ModelInfo };
