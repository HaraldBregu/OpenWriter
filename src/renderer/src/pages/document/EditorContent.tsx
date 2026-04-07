import React, { useRef, useState, useCallback, useEffect, useImperativeHandle } from 'react';
import { TextEditor, type TextEditorElement } from '@/components/editor/TextEditor';
import type { Editor } from '@tiptap/core';
import type { AssistantAgentId } from '@/components/editor/extensions/assistant';
import { subscribeToTask, initTaskMetadata } from '../../services/task-event-bus';
import type { TaskSnapshot } from '../../services/task-event-bus';
import { v7 as uuidv7 } from 'uuid';
import { useEditorInstance } from './providers';
import { useDocumentDispatch } from './hooks';
import { buildTaskPrompt, normalizeTaskPromptContext } from './shared';

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

const DOCUMENT_AGENT_TASK_TYPES: Record<AssistantAgentId, string> = {
	writer: 'agent-writer',
};

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

async function saveAssistantReferenceImages(
	documentId: string,
	files: File[]
): Promise<Array<{ fileName: string; filePath: string }>> {
	const saved: Array<{ fileName: string; filePath: string }> = [];

	for (const file of files) {
		const dataUri = await readFileAsDataUri(file);
		const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
		if (!match) continue;

		const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
		const base64 = match[2];
		const fileName = `${crypto.randomUUID()}.${ext}`;
		const result = await window.workspace.saveDocumentImage({
			documentId,
			fileName,
			base64,
		});
		saved.push(result);
	}

	return saved;
}

const EditorContent = React.forwardRef<EditorContentElement, EditorContentProps>(
	({ documentId, loaded, content, externalValueVersion, onChange, onUndo, onRedo }, ref) => {
		const dispatch = useDocumentDispatch();
		const { setEditor } = useEditorInstance();

		const editorRef = useRef<TextEditorElement>(null);

		const [assistantSessionId, setAssistantSessionId] = useState<string | null>(null);
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
					const prompt = buildTaskPrompt(before, after, input);

					const resolvedSessionId = assistantSessionId ?? uuidv7();
					if (!assistantSessionId) {
						setAssistantSessionId(resolvedSessionId);
					}

					if (typeof window.task?.submit !== 'function') {
						editorRef.current?.setAssistantLoading(false);
						editorRef.current?.setAssistantEnable(true);
						return;
					}

					const taskInput = { prompt };
					const metadata = {
						agentId: 'writer' as const,
						documentId,
						chatId: resolvedSessionId,
						before,
						after,
						cursorPos,
						referenceImages: [],
					};

					const ipcResult = await window.task.submit(
						DOCUMENT_AGENT_TASK_TYPES.writer,
						taskInput,
						metadata
					);
					if (!ipcResult.success) {
						editorRef.current?.setAssistantLoading(false);
						editorRef.current?.setAssistantEnable(true);
						return;
					}

					const resolvedTaskId = ipcResult.data.taskId;
					initTaskMetadata(resolvedTaskId, metadata);
					setAssistantActiveAgentId('writer');
					setAssistantActiveTaskId(resolvedTaskId);
				} catch {
					editorRef.current?.setAssistantLoading(false);
					editorRef.current?.setAssistantEnable(true);
				}
			},
			[assistantIsRunning, assistantSessionId, documentId]
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
					const savedReferenceImages =
						files.length > 0 ? await saveAssistantReferenceImages(documentId, files) : [];
					const referenceNote =
						savedReferenceImages.length > 0
							? `\n\nReference images saved in the document:\n${savedReferenceImages
									.map((image) => `- images/${image.fileName}`)
									.join('\n')}`
							: '';
					const prompt = buildTaskPrompt(before, after, `${input}${referenceNote}`);

					const resolvedSessionId = assistantSessionId ?? uuidv7();
					if (!assistantSessionId) {
						setAssistantSessionId(resolvedSessionId);
					}

					if (typeof window.task?.submit !== 'function') {
						editorRef.current?.setAssistantLoading(false);
						editorRef.current?.setAssistantEnable(true);
						return;
					}

					const taskInput = { prompt };
					const metadata = {
						agentId: 'image' as const,
						documentId,
						chatId: resolvedSessionId,
						before,
						after,
						cursorPos,
						referenceImages: savedReferenceImages,
					};

					const ipcResult = await window.task.submit(
						DOCUMENT_AGENT_TASK_TYPES.image,
						taskInput,
						metadata
					);
					if (!ipcResult.success) {
						editorRef.current?.setAssistantLoading(false);
						editorRef.current?.setAssistantEnable(true);
						return;
					}

					const resolvedTaskId = ipcResult.data.taskId;
					initTaskMetadata(resolvedTaskId, metadata);
					setAssistantActiveAgentId('image');
					setAssistantActiveTaskId(resolvedTaskId);
				} catch {
					editorRef.current?.setAssistantLoading(false);
					editorRef.current?.setAssistantEnable(true);
				}
			},
			[assistantIsRunning, assistantSessionId, documentId]
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
