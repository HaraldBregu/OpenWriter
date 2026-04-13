import { useCallback, useMemo } from 'react';
import type React from 'react';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import type { ContentGeneratorAction } from '../context/actions';
import type { ContentGeneratorAgentId } from '../agents';
import type { ContentGeneratorOptions } from '../input-extension';
import type { ModelInfo } from '../../../../../../../shared/types';
import { buildTaskPrompt } from '../../../../../pages/document/shared';

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

interface UseContentGeneratorActionsParams {
	dispatch: React.Dispatch<ContentGeneratorAction>;
	editor: Editor;
	node: ProseMirrorNode;
	getPos: () => number | undefined;
	options: ContentGeneratorOptions;
	updateAttributes: (attrs: Record<string, unknown>) => void;
	prompt: string;
	agentId: ContentGeneratorAgentId;
	files: File[];
	fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useContentGeneratorActions({
	dispatch,
	editor,
	node,
	getPos,
	options,
	updateAttributes,
	prompt,
	agentId,
	files,
	fileInputRef,
}: UseContentGeneratorActionsParams) {
	const handlePromptChange = useCallback(
		(value: string) => {
			dispatch({ type: 'SET_PROMPT', payload: value });
			if ((node.attrs.prompt as string) !== value) {
				updateAttributes({ prompt: value });
			}
		},
		[dispatch, node.attrs.prompt, updateAttributes]
	);

	const handleAgentChange = useCallback(
		(value: ContentGeneratorAgentId) => {
			dispatch({ type: 'SET_AGENT', payload: value });
			if ((node.attrs.agentId as ContentGeneratorAgentId) !== value) {
				updateAttributes({ agentId: value });
			}
		},
		[dispatch, node.attrs.agentId, updateAttributes]
	);

	const handleImageModelChange = useCallback(
		(model: ModelInfo) => {
			dispatch({ type: 'SET_IMAGE_MODEL', payload: model });
			options.onImageModelChange?.(model);
		},
		[dispatch, options]
	);

	const handleTextModelChange = useCallback(
		(model: ModelInfo) => {
			dispatch({ type: 'SET_TEXT_MODEL', payload: model });
			options.onTextModelChange?.(model);
		},
		[dispatch, options]
	);

	const addFile = useCallback(
		(newFile: File) => {
			dispatch({ type: 'ADD_FILE', payload: newFile });
			readFileAsDataUri(newFile)
				.then((result) => {
					dispatch({ type: 'ADD_PREVIEW_URL', payload: result });
				})
				.catch(() => {});
		},
		[dispatch]
	);

	const removeFile = useCallback(
		(index: number) => {
			dispatch({ type: 'REMOVE_FILE', payload: index });
		},
		[dispatch]
	);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selected = e.target.files;
			if (!selected) return;
			for (const file of Array.from(selected)) {
				if (file.type.startsWith('image/')) {
					addFile(file);
				}
			}
			e.target.value = '';
		},
		[addFile]
	);

	const handleOpenFilePicker = useCallback(() => {
		fileInputRef.current?.click();
	}, [fileInputRef]);

	const handleDragOver = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			if (agentId !== 'image') return;
			e.preventDefault();
			dispatch({ type: 'SET_DRAG_OVER', payload: true });
		},
		[agentId, dispatch]
	);

	const handleDragLeave = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			if (agentId !== 'image') return;
			e.preventDefault();
			dispatch({ type: 'SET_DRAG_OVER', payload: false });
		},
		[agentId, dispatch]
	);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			if (agentId !== 'image') return;
			e.preventDefault();
			dispatch({ type: 'SET_DRAG_OVER', payload: false });
			for (const file of Array.from(e.dataTransfer.files)) {
				if (file.type.startsWith('image/')) {
					addFile(file);
				}
			}
		},
		[addFile, agentId, dispatch]
	);

	const deleteNode = useCallback(() => {
		const pos = getPos();
		if (typeof pos !== 'number') return;

		const paragraph = editor.state.schema.nodes.paragraph;
		if (!paragraph) {
			editor
				.chain()
				.focus()
				.deleteRange({ from: pos, to: pos + node.nodeSize })
				.run();
			return;
		}

		const tr = editor.state.tr.replaceWith(pos, pos + node.nodeSize, paragraph.create());
		tr.setSelection(TextSelection.create(tr.doc, Math.min(pos + 1, tr.doc.content.size)));
		editor.view.dispatch(tr.scrollIntoView());
		editor.view.focus();
	}, [editor, getPos, node.nodeSize]);

	const submit = useCallback(() => {
		const trimmedPrompt = prompt.trim();
		const canSubmitWithFiles = agentId === 'image' && files.length > 0;
		if (!trimmedPrompt && !canSubmitWithFiles) {
			deleteNode();
			return;
		}

		const { from } = editor.state.selection;
		const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
		const serializer = storage.markdown?.serializer as
			| { serialize: (node: unknown) => string }
			| undefined;
		const docSize = editor.state.doc.content.size;
		const subDocBefore = editor.state.doc.cut(0, from);
		const subDocAfter = editor.state.doc.cut(from, docSize);
		const rawBefore =
			serializer?.serialize(subDocBefore) ?? editor.state.doc.textBetween(0, from, '\n');
		const rawAfter =
			serializer?.serialize(subDocAfter) ?? editor.state.doc.textBetween(from, docSize, '\n');
		const stripHtml = (text: string): string => text.replace(/<[^>]*>/g, '');

		updateAttributes({ loading: true, enable: false });

		const before = stripHtml(rawBefore);
		const after = stripHtml(rawAfter);

		if (agentId === 'image') {
			const effectivePrompt =
				!trimmedPrompt && files.length > 0
					? 'Create an image inspired by the uploaded reference images.'
					: trimmedPrompt;
			const builtPrompt = buildTaskPrompt(before, after, effectivePrompt);
			options.onGenerateImageSubmit(builtPrompt, files);
		} else {
			const builtPrompt = buildTaskPrompt(before, after, trimmedPrompt);
			options.onGenerateTextSubmit(builtPrompt);
		}
	}, [agentId, files, prompt, deleteNode, editor, options, updateAttributes]);

	return useMemo(
		() => ({
			handlePromptChange,
			handleAgentChange,
			handleImageModelChange,
			handleTextModelChange,
			addFile,
			removeFile,
			handleFileInputChange,
			handleOpenFilePicker,
			handleDragOver,
			handleDragLeave,
			handleDrop,
			deleteNode,
			submit,
		}),
		[
			handlePromptChange,
			handleAgentChange,
			handleImageModelChange,
			handleTextModelChange,
			addFile,
			removeFile,
			handleFileInputChange,
			handleOpenFilePicker,
			handleDragOver,
			handleDragLeave,
			handleDrop,
			deleteNode,
			submit,
		]
	);
}
