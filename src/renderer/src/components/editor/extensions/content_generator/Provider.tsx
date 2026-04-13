import React, { useReducer, useRef, useMemo } from 'react';
import type { NodeViewProps } from '@tiptap/react';
import { Context } from './context/context';
import type { ContextValue } from './context/context';
import { contentGeneratorReducer } from './context/reducer';
import type { ContentGeneratorState } from './context/state';
import { useContentGeneratorActions } from './hooks/use-content-generator-actions';
import { useTextareaSetup } from './hooks/use-textarea-setup';
import type { ContentGeneratorOptions, ContentGeneratorStorage } from './input-extension';
import type { ContentGeneratorAgentId } from './agents';
import { DEFAULT_TEXT_MODEL_ID } from '../../../../../../shared/types';
import { IMAGE_MODELS, TEXT_MODELS } from '../../../../../../shared/models';

interface ProviderProps {
	nodeViewProps: NodeViewProps;
	children: React.ReactNode;
}

export function Provider({ nodeViewProps, children }: ProviderProps): React.JSX.Element {
	const { editor, node, getPos, extension, updateAttributes } = nodeViewProps;

	const loading = node.attrs.loading as boolean;
	const enable = node.attrs.enable as boolean;
	const initialAgentId = (node.attrs.agentId as ContentGeneratorAgentId) ?? 'writer';
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
		})
	);

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

	const value = useMemo<ContextValue>(
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

	return <Context.Provider value={value}>{children}</Context.Provider>;
}
