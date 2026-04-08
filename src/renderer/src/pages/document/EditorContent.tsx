import React, {
	useRef,
	useCallback,
	useImperativeHandle,
	useState,
	useEffect,
	useMemo,
} from 'react';
import { debounce } from 'lodash';
import type { TextEditorElement } from '@/components/editor/TextEditor';
import type { Editor } from '@tiptap/core';
import { useEditorInstance } from './providers';
import { useDocumentDispatch, useAssistantTask } from './hooks';
import { EditorArea } from './components/EditorArea';
import type { ModelInfo } from '../../../../shared/types';
import { findModelById } from '../../../../shared/models';

const SAVE_DEBOUNCE_MS = 1500;

export interface EditorContentElement {
	setSearch: (query: string) => void;
	clearSearch: () => void;
	setContent: (content: string) => void;
}

interface EditorContentProps {
	readonly documentId: string | undefined;
	readonly onContentChange: (content: string) => void;
	readonly onUndo: () => void;
	readonly onRedo: () => void;
}

const EditorContent = React.forwardRef<EditorContentElement, EditorContentProps>(
	({ documentId, onContentChange, onUndo, onRedo }, ref) => {
		const dispatch = useDocumentDispatch();
		const { setEditor } = useEditorInstance();
		const editorRef = useRef<TextEditorElement>(null);

		const [content, setContentState] = useState('');
		const [loaded, setLoaded] = useState(false);
		const [contentVersion, setContentVersion] = useState(0);

		const [defaultTextModel, setDefaultTextModel] = useState<ModelInfo | undefined>(undefined);
		const [defaultImageModel, setDefaultImageModel] = useState<ModelInfo | undefined>(undefined);

		const contentRef = useRef(content);
		contentRef.current = content;

		const loadedRef = useRef(loaded);
		loadedRef.current = loaded;

		useEffect(() => {
			if (!documentId) return;
			let cancelled = false;

			setLoaded(false);
			setContentState('');

			(async () => {
				try {
					const [loadedContent, config] = await Promise.all([
						window.workspace.getDocumentContent(documentId),
						window.workspace.getDocumentConfig(documentId),
					]);
					if (cancelled) return;

					setContentState(loadedContent);
					dispatch({ type: 'CONTENT_CHANGED', value: loadedContent });
					onContentChange(loadedContent);
					setLoaded(true);

					const textModel = findModelById(config.textModel);
					if (textModel) setDefaultTextModel(textModel);
					const imageModel = findModelById(config.imageModel);
					if (imageModel) setDefaultImageModel(imageModel);
				} catch {
					if (!cancelled) setLoaded(true);
				}
			})();

			return () => {
				cancelled = true;
			};
		}, [documentId, dispatch, onContentChange]);

		const debouncedSave = useMemo(
			() =>
				debounce(
					() => {
						if (!documentId || !loadedRef.current) return;
						window.workspace.updateDocumentContent(documentId, contentRef.current);
					},
					SAVE_DEBOUNCE_MS,
					{ leading: false, trailing: true }
				),
			[documentId]
		);

		useEffect(() => {
			return () => {
				debouncedSave.flush();
				debouncedSave.cancel();
			};
		}, [debouncedSave]);

		useEffect(() => {
			if (!documentId) return;

			const unsubscribe = window.workspace.onDocumentContentChanges(
				documentId,
				(updatedContent) => {
					setContentState(updatedContent);
					setContentVersion((v) => v + 1);
					dispatch({ type: 'CONTENT_CHANGED', value: updatedContent });
					onContentChange(updatedContent);
				}
			);

			return unsubscribe;
		}, [documentId, dispatch, onContentChange]);

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
			setContent: (newContent: string) => {
				setContentState(newContent);
				setContentVersion((v) => v + 1);
				dispatch({ type: 'CONTENT_CHANGED', value: newContent });
				debouncedSave();
			},
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
				setContentState(newContent);
				dispatch({ type: 'CONTENT_CHANGED', value: newContent });
				onContentChange(newContent);
				debouncedSave();
			},
			[dispatch, onContentChange, debouncedSave]
		);

		return (
			<EditorArea
				loaded={loaded}
				disabled={assistantIsRunning}
				editorRef={editorRef}
				content={content}
				externalValueVersion={contentVersion}
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
