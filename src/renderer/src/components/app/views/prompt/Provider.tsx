import React, { useReducer, useRef, useMemo, useCallback, useEffect } from 'react';
import type { NodeViewProps } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { contentGeneratorReducer } from './context/reducer';
import type { ModelInfo } from 'src/shared/types';
import { usePromptActions, useTextareaSetup } from './hooks';

const DEFAULT_IMAGE_MODEL: ModelInfo = {
	providerId: 'openai',
	modelId: 'gpt-image-1',
	name: 'GPT Image 1',
	type: 'image',
	contextWindow: null,
	maxOutputTokens: null,
};

const DEFAULT_TEXT_MODEL: ModelInfo = {
	providerId: 'openai',
	modelId: 'gpt-5.4-mini',
	name: 'GPT-5.4 Mini',
	type: 'multimodal',
	contextWindow: 400000,
	maxOutputTokens: 128000,
};
import type { PromptOptions } from '../../editor/extensions/prompt-extension';
import { Context, ContextValue, State } from './context';

interface ProviderProps {
	nodeViewProps: NodeViewProps;
	children: React.ReactNode;
}

export function Provider({ nodeViewProps, children }: ProviderProps): React.JSX.Element {
	const { editor, node, getPos, extension, updateAttributes } = nodeViewProps;

	const loading = node.attrs.loading as boolean;
	const enable = node.attrs.enable as boolean;
	const statusBarVisible = (node.attrs.statusBarVisible as boolean) ?? false;
	const statusBarMessage = (node.attrs.statusBarMessage as string) ?? '';
	const options = extension.options as PromptOptions;

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [state, dispatch] = useReducer(
		contentGeneratorReducer,
		undefined,
		(): State => ({
			prompt: (node.attrs.prompt as string) ?? '',
			files: (node.attrs.files as File[] | null) ?? [],
			previewUrls: [],
			isDragOver: false,
			selectedImageModel: IMAGE_MODELS[0],
			selectedTextModel:
				TEXT_MODELS.find((m) => m.modelId === DEFAULT_TEXT_MODEL_ID) ?? TEXT_MODELS[0],
			selection: '',
		})
	);

	const nodeFiles = (node.attrs.files as File[] | null) ?? null;
	useEffect(() => {
		if (nodeFiles !== state.files) {
			updateAttributes({ files: state.files });
		}
	}, [state.files, nodeFiles, updateAttributes]);

	const setSelection = useCallback((value: string) => {
		dispatch({ type: 'SET_SELECTION', payload: value });
	}, []);

	const clearSelection = useCallback(() => {
		if (editor.isDestroyed) return;
		const { from, to } = editor.state.selection;
		if (from === to) return;
		const docSize = editor.state.doc.content.size;
		const collapsePos = Math.max(0, Math.min(to, docSize));
		const nextSelection = TextSelection.near(editor.state.doc.resolve(collapsePos), -1);
		const tr = editor.state.tr.setSelection(nextSelection);
		editor.view.dispatch(tr);
	}, [editor]);

	const nodePrompt = (node.attrs.prompt as string) ?? '';
	useEffect(() => {
		if (state.prompt !== nodePrompt) {
			dispatch({ type: 'SET_PROMPT', payload: nodePrompt });
		}
	}, [nodePrompt, state.prompt]);

	useEffect(() => {
		const emit = (): void => {
			const { from, to } = editor.state.selection;
			const text = from === to ? '' : editor.state.doc.textBetween(from, to, ' ');
			setSelection(text);
		};
		emit();
		editor.on('selectionUpdate', emit);
		return () => {
			editor.off('selectionUpdate', emit);
		};
	}, [editor, setSelection]);

	const actions = usePromptActions({
		dispatch,
		editor,
		node,
		getPos,
		options,
		updateAttributes,
		prompt: state.prompt,
		fileInputRef,
	});

	const { submitRef, resizeTextarea } = useTextareaSetup({
		textareaRef,
		onSubmit: actions.submit,
		onDelete: actions.deleteNode,
	});

	const isSubmitDisabled = !enable || loading || !state.prompt.trim();

	const value = useMemo<ContextValue>(
		() => ({
			state,
			loading,
			enable,
			statusBarVisible,
			statusBarMessage,
			isSubmitDisabled,
			textareaRef,
			fileInputRef,
			submitRef,
			...actions,
			setSelection,
			clearSelection,
			resizeTextarea,
		}),
		[
			state,
			loading,
			enable,
			statusBarVisible,
			statusBarMessage,
			isSubmitDisabled,
			submitRef,
			actions,
			setSelection,
			clearSelection,
			resizeTextarea,
		]
	);

	return <Context.Provider value={value}>{children}</Context.Provider>;
}
