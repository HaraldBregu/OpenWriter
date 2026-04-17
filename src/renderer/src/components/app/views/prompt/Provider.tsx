import React, { useReducer, useRef, useMemo, useCallback, useEffect } from 'react';
import type { NodeViewProps } from '@tiptap/react';
import { ContentGeneratorContext } from './context/context';
import type { ContentGeneratorContextValue } from './context/context';
import { contentGeneratorReducer } from './context/reducer';
import type { ContentGeneratorState } from './context/state';
import { DEFAULT_TEXT_MODEL_ID } from 'src/shared/types';

type ContentGeneratorAgentId = 'text' | 'image';
import { IMAGE_MODELS, TEXT_MODELS } from 'src/shared/models';
import { ContentGeneratorOptions, ContentGeneratorStorage } from '../../editor/extensions/content-generator-extension';
import { useContentGeneratorActions, useTextareaSetup } from './hooks';

interface ProviderProps {
	nodeViewProps: NodeViewProps;
	children: React.ReactNode;
}

export function ContentGeneratorProvider({ nodeViewProps, children }: ProviderProps): React.JSX.Element {
	const { editor, node, getPos, extension, updateAttributes } = nodeViewProps;

	const loading = node.attrs.loading as boolean;
	const enable = node.attrs.enable as boolean;
	const initialAgentId = (node.attrs.agentId as ContentGeneratorAgentId) ?? 'text';
	const options = extension.options as ContentGeneratorOptions;
	const storage = (editor.storage as unknown as Record<string, ContentGeneratorStorage>)
		.contentGenerator;

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [state, dispatch] = useReducer(
		contentGeneratorReducer,
		undefined,
		(): ContentGeneratorState => ({
			prompt: (node.attrs.prompt as string) ?? '',
			agentId: initialAgentId,
			files: [],
			previewUrls: [],
			isDragOver: false,
			selectedImageModel: storage.defaultImageModel ?? IMAGE_MODELS[0],
			selectedTextModel:
				storage.defaultTextModel ??
				TEXT_MODELS.find((m) => m.modelId === DEFAULT_TEXT_MODEL_ID) ??
				TEXT_MODELS[0],
			selection: '',
		})
	);

	const setSelection = useCallback((value: string) => {
		dispatch({ type: 'SET_SELECTION', payload: value });
	}, []);

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

	const actions = useContentGeneratorActions({
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

	const value = useMemo<ContentGeneratorContextValue>(
		() => ({
			state,
			loading,
			enable,
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
			isImage,
			activeModel,
			isSubmitDisabled,
			submitRef,
			actions,
			resizeTextarea,
		]
	);

	return <ContentGeneratorContext.Provider value={value}>{children}</ContentGeneratorContext.Provider>;
}
