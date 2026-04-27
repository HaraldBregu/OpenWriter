import type { Editor } from '@tiptap/core';

export type AiActionType =
	| 'improve-selected-text-writing'
	| 'fix-selected-text-grammar'
	| 'custom';

export type PromptSubmitPayload =
	| { prompt: string; files: File[]; editor: Editor }
	| { type: AiActionType; text: string; prompt?: string };

export interface PromptOptions {
	onPromptSubmit: (
		payload: Extract<PromptSubmitPayload, { files: File[] }>
	) => void;
}
