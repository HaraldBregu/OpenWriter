import React, { useCallback, useMemo, useReducer } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorContext } from './context/context';
import type { AssistantAction, EditorContextValue } from './context/context';
import { editorReducer } from './context/reducer';
import type { EditorState } from './context/state';
import type { HoveredBlock } from './context/state';
import { useBlockHover } from './hooks/use-block-hover';
import { InsertImageDialog } from '../dialogs';

interface ProviderProps {
	editor: Editor;
	containerRef: React.RefObject<HTMLDivElement | null>;
	onInsertContent?: () => void;
	onAssistantAction?: (action: AssistantAction, editor: Editor) => void;
	onImageInsert: (result: { src: string; alt: string; title: string }) => void;
	children: React.ReactNode;
}

export function Provider({
	editor,
	containerRef,
	onInsertContent,
	onOpenChat,
	onAssistantAction,
	onImageInsert,
	children,
}: ProviderProps): React.JSX.Element {
	const [state, dispatch] = useReducer(
		editorReducer,
		undefined,
		(): EditorState => ({
			hoveredBlock: null,
			imageDialogOpen: false,
		})
	);

	useBlockHover({ editor, containerRef, dispatch });

	const setHoveredBlock = useCallback(
		(block: HoveredBlock | null) => dispatch({ type: 'SET_HOVERED_BLOCK', payload: block }),
		[]
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
			setHoveredBlock,
			setImageDialogOpen,
			onInsertContent,
			onOpenChat,
			onAssistantAction,
		}),
		[
			state,
			editor,
			containerRef,
			setHoveredBlock,
			setImageDialogOpen,
			onInsertContent,
			onOpenChat,
			onAssistantAction,
		]
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
