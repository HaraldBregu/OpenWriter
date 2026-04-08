import React, { useRef, useState, useCallback, useEffect, useImperativeHandle } from 'react';
import { TextEditor, type TextEditorElement } from '@/components/editor/TextEditor';
import type { Editor } from '@tiptap/core';
import type { AssistantAgentId } from '@/components/editor/extensions/assistant';
import { subscribeToTask } from '../../services/task-event-bus';
import type { TaskSnapshot } from '../../services/task-event-bus';
import { useEditorInstance } from './providers';
import { useDocumentDispatch, useImageTaskSubmit, useWriterTaskSubmit } from './hooks';
import { normalizeTaskPromptContext } from './shared';

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
		const writerTask = useWriterTaskSubmit(documentId);
		const imageTask = useImageTaskSubmit(documentId);

		const [assistantActiveTaskId, setAssistantActiveTaskId] = useState<string | null>(null);
		const [assistantActiveAgentId, setAssistantActiveAgentId] =
			useState<AssistantAgentId>('writer');
		const assistantIsRunning = assistantActiveTaskId !== null;
		const pendingCloseMenuRef = useRef<(() => void) | null>(null);

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

		useEffect(() => {
			if (!assistantActiveTaskId) return;

			const unsub = subscribeToTask(assistantActiveTaskId, (snap: TaskSnapshot) => {
				if (snap.status === 'started') {
					editorRef.current?.setAssistantLoading(true);
					if (pendingCloseMenuRef.current) {
						pendingCloseMenuRef.current();
						pendingCloseMenuRef.current = null;
					}
					return;
				}

				const completed = snap.status === 'completed';
				const output = snap.result as { content?: string } | undefined;
				const streamContent = output?.content ?? snap.streamedContent ?? '';

				if (streamContent) {
					const isImageAgent = assistantActiveAgentId === 'image';
					if (completed && isImageAgent) {
						editorRef.current?.insertMarkdownText(streamContent, {
							preventEditorUpdate: !completed,
						});
					} else {
						editorRef.current?.insertText(streamContent, { preventEditorUpdate: !completed });
					}
				}

				if (completed || snap.status === 'error' || snap.status === 'cancelled') {
					if (pendingCloseMenuRef.current) {
						pendingCloseMenuRef.current();
						pendingCloseMenuRef.current = null;
					}
					editorRef.current?.removeAssistant();
					setAssistantActiveTaskId(null);
				}
			});

			return unsub;
		}, [assistantActiveAgentId, assistantActiveTaskId]);

		const handleGenerateTextSubmit = useCallback(
			async (before: string, after: string, cursorPos: number, input: string) => {
				if (!documentId || assistantIsRunning) {
					editorRef.current?.setAssistantLoading(false);
					editorRef.current?.setAssistantEnable(true);
					return;
				}

				editorRef.current?.setAssistantLoading(true);
				editorRef.current?.setAssistantEnable(false);

				try {
					const taskId = await writerTask.submit({
						before,
						after,
						cursorPos,
						input,
					});

					if (!taskId) {
						editorRef.current?.setAssistantLoading(false);
						editorRef.current?.setAssistantEnable(true);
						return;
					}

					setAssistantActiveAgentId('writer');
					setAssistantActiveTaskId(taskId);
				} catch {
					editorRef.current?.setAssistantLoading(false);
					editorRef.current?.setAssistantEnable(true);
				}
			},
			[assistantIsRunning, documentId, writerTask]
		);

		const handleGenerateImageSubmit = useCallback(
			async (before: string, after: string, cursorPos: number, input: string, files: File[]) => {
				if (!documentId || assistantIsRunning) {
					editorRef.current?.setAssistantLoading(false);
					editorRef.current?.setAssistantEnable(true);
					return;
				}

				editorRef.current?.setAssistantLoading(true);
				editorRef.current?.setAssistantEnable(false);

				try {
					const taskId = await imageTask.submit({
						before,
						after,
						cursorPos,
						input,
						files,
					});

					if (!taskId) {
						editorRef.current?.setAssistantLoading(false);
						editorRef.current?.setAssistantEnable(true);
						return;
					}

					setAssistantActiveAgentId('image');
					setAssistantActiveTaskId(taskId);
				} catch {
					editorRef.current?.setAssistantLoading(false);
					editorRef.current?.setAssistantEnable(true);
				}
			},
			[assistantIsRunning, documentId, imageTask]
		);

		const handleContinueWithAssistant = useCallback(
			(before: string, after: string, cursorPos: number, closeMenu: () => void) => {
				if (assistantIsRunning) {
					closeMenu();
					return;
				}
				const { before: cleanBefore, after: cleanAfter } = normalizeTaskPromptContext(
					before,
					after
				);
				pendingCloseMenuRef.current = closeMenu;
				handleGenerateTextSubmit(
					cleanBefore,
					cleanAfter,
					cursorPos,
					'CONTINUE WRITING HERE WITH 15 WORDS MAX'
				).catch(() => {
					pendingCloseMenuRef.current = null;
					closeMenu();
				});
			},
			[assistantIsRunning, handleGenerateTextSubmit]
		);

		return (
			<div className="h-full min-w-0 flex flex-col">
				<div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
					<div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-10 py-10">
						{loaded && (
							<TextEditor
								disabled={assistantIsRunning}
								ref={editorRef}
								value={content}
								onSelectionChange={handleSelectionChange}
								externalValueVersion={externalValueVersion}
								onChange={handleContentChange}
								onContinueWithAssistant={handleContinueWithAssistant}
								onGenerateTextSubmit={handleGenerateTextSubmit}
								onGenerateImageSubmit={handleGenerateImageSubmit}
								documentId={documentId}
								onEditorReady={handleEditorReady}
								onUndo={onUndo}
								onRedo={onRedo}
							/>
						)}
					</div>
				</div>
			</div>
		);
	}
);

EditorContent.displayName = 'EditorContent';

export default EditorContent;
