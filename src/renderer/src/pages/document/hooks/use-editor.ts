import { useCallback, useMemo, type RefObject } from 'react';
import type { EditorElement } from '@/components/app/editor/Editor';

export interface EditorActions {
	showLoading: () => void;
	hideLoading: () => void;
	enable: () => void;
	disable: () => void;
	closePrompt: () => void;
	clearPromptInput: () => void;
	insertPromptView: () => void;
	insertText: (text: string, options?: { preventEditorUpdate?: boolean }) => void;
	insertMarkdownText: (
		text: string,
		options?: { from?: number; to?: number; preventEditorUpdate?: boolean }
	) => void;
}

export function useEditor(editorRef: RefObject<EditorElement | null>): EditorActions {
	const showLoading = useCallback(() => {
		editorRef.current?.setAssistantLoading(true);
	}, [editorRef]);

	const hideLoading = useCallback(() => {
		editorRef.current?.setAssistantLoading(false);
	}, [editorRef]);

	const enable = useCallback(() => {
		editorRef.current?.setAssistantEnable(true);
	}, [editorRef]);

	const disable = useCallback(() => {
		editorRef.current?.setAssistantEnable(false);
	}, [editorRef]);

	const closePrompt = useCallback(() => {
		editorRef.current?.removeAssistant();
	}, [editorRef]);

	const clearPromptInput = useCallback(() => {
		editorRef.current?.clearPromptInput();
	}, [editorRef]);

	const insertPromptView = useCallback(() => {
		editorRef.current?.insertPromptView();
	}, [editorRef]);

	const insertText = useCallback<EditorActions['insertText']>(
		(text, options) => {
			editorRef.current?.insertText(text, options);
		},
		[editorRef]
	);

	const insertMarkdownText = useCallback<EditorActions['insertMarkdownText']>(
		(text, options) => {
			editorRef.current?.insertMarkdownText(text, options);
		},
		[editorRef]
	);

	return useMemo(
		() => ({
			showLoading,
			hideLoading,
			enable,
			disable,
			closePrompt,
			clearPromptInput,
			insertPromptView,
			insertText,
			insertMarkdownText,
		}),
		[
			showLoading,
			hideLoading,
			enable,
			disable,
			closePrompt,
			clearPromptInput,
			insertPromptView,
			insertText,
			insertMarkdownText,
		]
	);
}
