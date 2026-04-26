import React, { useCallback, useMemo, useReducer } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorContext } from './context/context';
import type { EditorContextValue } from './context/context';
import { editorReducer } from './context/reducer';
import type { EditorState } from './context/state';
import { InsertImageDialog } from '../dialogs';

interface ProviderProps {
	editor: Editor;
	containerRef: React.RefObject<HTMLDivElement | null>;
	onInsertContent?: () => void;
	onImageInsert: (result: { src: string; alt: string; title: string }) => void;
	children: React.ReactNode;
}

export function Provider({
	editor,
	containerRef,
	onInsertContent,
	onImageInsert,
	children,
}: ProviderProps): React.JSX.Element {
	const [state, dispatch] = useReducer(
		editorReducer,
		undefined,
		(): EditorState => ({
			imageDialogOpen: false,
		})
	);

	const setImageDialogOpen = useCallback(
		(open: boolean) => dispatch({ type: 'SET_IMAGE_DIALOG_OPEN', payload: open }),
		[]
	);

	const value = useMemo<EditorContextValue>(
		() => ({
			state,
			editor,
			containerRef,
			setImageDialogOpen,
			onInsertContent,
		}),
		[state, editor, containerRef, setImageDialogOpen, onInsertContent]
	);

	return (
		<EditorContext.Provider value={value}>
			{children}
			<InsertImageDialog
				open={state.imageDialogOpen}
				onOpenChange={setImageDialogOpen}
				onInsert={onImageInsert}
			/>
		</EditorContext.Provider>
	);
}
