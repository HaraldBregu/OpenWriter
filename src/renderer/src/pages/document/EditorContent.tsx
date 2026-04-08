import React, { useRef, useCallback, useImperativeHandle, useState, useEffect } from 'react';
import type { TextEditorElement } from '@/components/editor/TextEditor';
import type { Editor } from '@tiptap/core';
import { useEditorInstance } from './providers';
import { useDocumentDispatch, useAssistantTask } from './hooks';
import { EditorArea } from './components/EditorArea';
import type { ModelInfo } from '../../../../shared/types';
import { findModelById } from '../../../../shared/models';

export interface EditorContentElement {
	setSearch: (query: string) => void;
	clearSearch: () => void;
}

interface EditorContentProps {
	readonly documentId: string | undefined;
	readonly loaded: boolean;
	readonly content: string;
	readonly externalValueVersion: number;
	readonly onChange: (newContent: string) => void;
	readonly onUndo: () => void;
	readonly onRedo: () => void;
}

const EditorContent = React.forwardRef<EditorContentElement, EditorContentProps>(
	({ documentId, loaded, content, externalValueVersion, onChange, onUndo, onRedo }, ref) => {
		const dispatch = useDocumentDispatch();
		const { setEditor } = useEditorInstance();
		const editorRef = useRef<TextEditorElement>(null);

		const [defaultTextModel, setDefaultTextModel] = useState<ModelInfo | undefined>(undefined);
		const [defaultImageModel, setDefaultImageModel] = useState<ModelInfo | undefined>(undefined);

		const defaultImageModelRef = useRef(defaultImageModel);
		defaultImageModelRef.current = defaultImageModel;

		useEffect(() => {
			if (!documentId) return;
			let cancelled = false;

			(async () => {
				try {
					const config = await window.workspace.getDocumentConfig(documentId);
					if (cancelled) return;
					const textModel = findModelById(config.textModel);
					if (textModel) setDefaultTextModel(textModel);
					const imageModel = findModelById(config.imageModel);
					if (imageModel) setDefaultImageModel(imageModel);
				} catch {
					// document config unavailable — use built-in defaults
				}
			})();

			return () => {
				cancelled = true;
			};
		}, [documentId]);

		const updateDocumentConfig = useCallback(
			async (update: { textModel?: string; imageModel?: string }) => {
				if (!documentId) return;
				try {
					await window.workspace.updateDocumentConfig(documentId, update);
				} catch {
					// silently ignore write errors
				}
			},
			[documentId]
		);

		const handleTextModelChange = useCallback(
			(model: ModelInfo) => {
				setDefaultTextModel(model);
				updateDocumentConfig({ textModel: model.modelId });
			},
			[updateDocumentConfig]
		);

		const handleImageModelChange = useCallback(
			(model: ModelInfo) => {
				setDefaultImageModel(model);
				updateDocumentConfig({ imageModel: model.modelId });
			},
			[updateDocumentConfig]
		);

		const {
			assistantIsRunning,
			handleGenerateTextSubmit,
			handleGenerateImageSubmit,
			handleContinueWithAssistant,
		} = useAssistantTask(documentId, editorRef, defaultImageModelRef);

		useImperativeHandle(ref, () => ({
			setSearch: (query: string) => editorRef.current?.setSearch(query),
			clearSearch: () => editorRef.current?.clearSearch(),
		}));

		const handleEditorReady = useCallback(
			(editor: Editor | null) => {
				setEditor(editor);
			},
			[setEditor]
		);

		const handleSelectionChange = useCallback(
			(selection: { from: number; to: number } | null) => {
				dispatch({ type: 'EDITOR_SELECTION_CHANGED', selection });
			},
			[dispatch]
		);

		const handleContentChange = useCallback(
			(newContent: string) => {
				dispatch({ type: 'CONTENT_CHANGED', value: newContent });
				onChange(newContent);
			},
			[dispatch, onChange]
		);

		return (
			<EditorArea
				loaded={loaded}
				disabled={assistantIsRunning}
				editorRef={editorRef}
				content={content}
				externalValueVersion={externalValueVersion}
				documentId={documentId}
				defaultTextModel={defaultTextModel}
				defaultImageModel={defaultImageModel}
				onTextModelChange={handleTextModelChange}
				onImageModelChange={handleImageModelChange}
				onEditorReady={handleEditorReady}
				onSelectionChange={handleSelectionChange}
				onChange={handleContentChange}
				onContinueWithAssistant={handleContinueWithAssistant}
				onGenerateTextSubmit={handleGenerateTextSubmit}
				onGenerateImageSubmit={handleGenerateImageSubmit}
				onUndo={onUndo}
				onRedo={onRedo}
			/>
		);
	}
);

EditorContent.displayName = 'EditorContent';

export default EditorContent;
