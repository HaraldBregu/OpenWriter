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

interface DocumentConfig {
	defaultTextModelId?: string;
	defaultImageModelId?: string;
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

		const defaultTextModelRef = useRef(defaultTextModel);
		defaultTextModelRef.current = defaultTextModel;

		const defaultImageModelRef = useRef(defaultImageModel);
		defaultImageModelRef.current = defaultImageModel;

		useEffect(() => {
			if (!documentId) return;
			let cancelled = false;

			(async () => {
				try {
					const docPath = await window.workspace.getDocumentPath(documentId);
					const configPath = `${docPath}/config.json`;
					const raw = await window.workspace.readFile({ filePath: configPath });
					if (cancelled) return;
					const config = JSON.parse(raw) as DocumentConfig;
					if (config.defaultTextModelId) {
						const model = findModelById(config.defaultTextModelId);
						if (model) setDefaultTextModel(model);
					}
					if (config.defaultImageModelId) {
						const model = findModelById(config.defaultImageModelId);
						if (model) setDefaultImageModel(model);
					}
				} catch {
					// config.json doesn't exist yet — use built-in defaults
				}
			})();

			return () => {
				cancelled = true;
			};
		}, [documentId]);

		const saveDocumentConfig = useCallback(
			async (update: Partial<DocumentConfig>) => {
				if (!documentId) return;
				try {
					const docPath = await window.workspace.getDocumentPath(documentId);
					const configPath = `${docPath}/config.json`;
					let existing: DocumentConfig = {};
					try {
						const raw = await window.workspace.readFile({ filePath: configPath });
						existing = JSON.parse(raw) as DocumentConfig;
					} catch {
						// file doesn't exist yet
					}
					const merged = { ...existing, ...update };
					await window.workspace.writeFile({
						filePath: configPath,
						content: JSON.stringify(merged, null, 2),
						createParents: true,
					});
				} catch {
					// silently ignore write errors
				}
			},
			[documentId]
		);

		const handleTextModelChange = useCallback(
			(model: ModelInfo) => {
				setDefaultTextModel(model);
				saveDocumentConfig({ defaultTextModelId: model.modelId });
			},
			[saveDocumentConfig]
		);

		const handleImageModelChange = useCallback(
			(model: ModelInfo) => {
				setDefaultImageModel(model);
				saveDocumentConfig({ defaultImageModelId: model.modelId });
			},
			[saveDocumentConfig]
		);

		const {
			assistantIsRunning,
			handleGenerateTextSubmit,
			handleGenerateImageSubmit,
			handleContinueWithAssistant,
		} = useAssistantTask(documentId, editorRef, defaultTextModelRef, defaultImageModelRef);

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
