import { useCallback, useMemo } from 'react';
import type React from 'react';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { ImageAction } from '../context/actions';

interface UseImageActionsParams {
	dispatch: React.Dispatch<ImageAction>;
	editor: Editor;
	node: ProseMirrorNode;
	getPos: () => number | undefined;
}

export function useImageActions({ dispatch, editor, node, getPos }: UseImageActionsParams) {
	const handleError = useCallback(() => {
		dispatch({ type: 'IMAGE_ERROR' });
	}, [dispatch]);

	const handleLoad = useCallback(() => {
		dispatch({ type: 'IMAGE_LOADED' });
	}, [dispatch]);

	const handleDelete = useCallback(() => {
		const pos = getPos();
		if (typeof pos !== 'number') return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: pos, to: pos + node.nodeSize })
			.run();
	}, [editor, getPos, node.nodeSize]);

	const handleAskAI = useCallback(() => {
		dispatch({ type: 'START_AI_EDIT' });
	}, [dispatch]);

	const handleEdit = useCallback(() => {
		dispatch({ type: 'START_EDIT' });
	}, [dispatch]);

	const handleImageClick = useCallback(() => {
		dispatch({ type: 'SET_PREVIEWING', payload: true });
	}, [dispatch]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				dispatch({ type: 'SET_PREVIEWING', payload: true });
			}
		},
		[dispatch]
	);

	const handleEditorSave = useCallback(
		async (dataUri: string) => {
			const pos = getPos();
			if (typeof pos !== 'number') return;

			const imgStorage = editor.storage as unknown as Record<string, Record<string, unknown>>;
			const saveHandler = imgStorage.image?.onImageEditSave as
				| ((dataUri: string) => Promise<string>)
				| null;

			const finalSrc = saveHandler ? await saveHandler(dataUri) : dataUri;
			if (editor.isDestroyed) return;

			editor.view.dispatch(
				editor.view.state.tr.setNodeMarkup(pos, undefined, {
					...node.attrs,
					src: finalSrc,
				})
			);
			dispatch({ type: 'FINISH_EDIT' });
		},
		[dispatch, editor, getPos, node.attrs]
	);

	const handleEditorCancel = useCallback(() => {
		dispatch({ type: 'FINISH_EDIT' });
	}, [dispatch]);

	const setHovered = useCallback(
		(value: boolean) => dispatch({ type: 'SET_HOVERED', payload: value }),
		[dispatch]
	);

	const setFocused = useCallback(
		(value: boolean) => dispatch({ type: 'SET_FOCUSED', payload: value }),
		[dispatch]
	);

	const setPreviewing = useCallback(
		(value: boolean) => dispatch({ type: 'SET_PREVIEWING', payload: value }),
		[dispatch]
	);

	return useMemo(
		() => ({
			handleError,
			handleLoad,
			handleDelete,
			handleAskAI,
			handleEdit,
			handleImageClick,
			handleKeyDown,
			handleEditorSave,
			handleEditorCancel,
			setHovered,
			setFocused,
			setPreviewing,
		}),
		[
			handleError,
			handleLoad,
			handleDelete,
			handleAskAI,
			handleEdit,
			handleImageClick,
			handleKeyDown,
			handleEditorSave,
			handleEditorCancel,
			setHovered,
			setFocused,
			setPreviewing,
		]
	);
}
