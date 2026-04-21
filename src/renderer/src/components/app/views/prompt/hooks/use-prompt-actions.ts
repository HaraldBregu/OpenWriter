import { useCallback, useMemo } from 'react';
import type React from 'react';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { PromptOptions } from '@shared/index';
import { Action } from '../context';

type AgentId = 'text' | 'image';

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

interface UseContentGeneratorActionsParams {
	dispatch: React.Dispatch<Action>;
	editor: Editor;
	node: ProseMirrorNode;
	getPos: () => number | undefined;
	options: PromptOptions;
	updateAttributes: (attrs: Record<string, unknown>) => void;
	prompt: string;
	agentId: AgentId;
	files: File[];
	fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function usePromptActions({
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
		(value: AgentId) => {
			dispatch({ type: 'SET_AGENT', payload: value });
			if ((node.attrs.agentId as AgentId) !== value) {
				updateAttributes({ agentId: value });
			}
		},
		[dispatch, node.attrs.agentId, updateAttributes]
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

	const handleFilesChange = useCallback(
		(files: File[]) => {
			dispatch({ type: 'SET_FILES', payload: files });
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
			e.preventDefault();
			dispatch({ type: 'SET_DRAG_OVER', payload: true });
		},
		[dispatch]
	);

	const handleDragLeave = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			dispatch({ type: 'SET_DRAG_OVER', payload: false });
		},
		[dispatch]
	);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			dispatch({ type: 'SET_DRAG_OVER', payload: false });
			for (const file of Array.from(e.dataTransfer.files)) {
				if (file.type.startsWith('image/')) {
					addFile(file);
				}
			}
		},
		[addFile, dispatch]
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

		updateAttributes({ loading: true, enable: false });

		if (agentId === 'image') {
			const effectivePrompt =
				!trimmedPrompt && files.length > 0
					? 'Create an image inspired by the uploaded reference images.'
					: trimmedPrompt;
			options.onPromptSubmit({ prompt: effectivePrompt, files, editor });
		} else {
			options.onPromptSubmit({ prompt: trimmedPrompt, files: [], editor });
		}
	}, [agentId, editor, files, prompt, deleteNode, options, updateAttributes]);

	return useMemo(
		() => ({
			handlePromptChange,
			handleAgentChange,
			addFile,
			removeFile,
			handleFilesChange,
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
			addFile,
			removeFile,
			handleFilesChange,
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
