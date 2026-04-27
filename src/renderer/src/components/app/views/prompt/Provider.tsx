import React, { useReducer, useRef, useMemo, useCallback, useEffect } from 'react';
import type { NodeViewProps } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { contentGeneratorReducer } from './context/reducer';
import { DEFAULT_TEXT_MODEL_ID, IMAGE_MODELS, TEXT_MODELS } from 'src/shared/models';
import { usePromptActions, useTextareaSetup } from './hooks';
import { PromptOptions } from '@shared/index';
import { Context, ContextValue, State } from './context';

type ContentGeneratorAgentId = 'text' | 'image';

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
	const initialAgentId = (node.attrs.agentId as ContentGeneratorAgentId) ?? 'text';
	const options = extension.options as PromptOptions;

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [state, dispatch] = useReducer(
		contentGeneratorReducer,
		undefined,
		(): State => ({
			prompt: (node.attrs.prompt as string) ?? '',
			agentId: initialAgentId,
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
		agentId: state.agentId,
		files: state.files,
		fileInputRef,
	});

	const { submitRef, resizeTextarea } = useTextareaSetup({
		textareaRef,
		onSubmit: actions.submit,
		onDelete: actions.deleteNode,
	});

	const isImage = state.agentId === 'image';
	const activeModel = isImage ? state.selectedImageModel : state.selectedTextModel;
	const isSubmitDisabled =
		!enable || loading || (!state.prompt.trim() && (!isImage || state.files.length === 0));

	const value = useMemo<ContextValue>(
		() => ({
			state,
			loading,
			enable,
			statusBarVisible,
			statusBarMessage,
			agentId: state.agentId,
			isImage,
			activeModel,
			isSubmitDisabled,
			textareaRef,
			fileInputRef,
			submitRef,
			...actions,
			setSelection,
			resizeTextarea,
		}),
		[
			state,
			loading,
			enable,
			statusBarVisible,
			statusBarMessage,
			isImage,
			activeModel,
			isSubmitDisabled,
			submitRef,
			actions,
			setSelection,
			resizeTextarea,
		]
	);

	return <Context.Provider value={value}>{children}</Context.Provider>;
}
