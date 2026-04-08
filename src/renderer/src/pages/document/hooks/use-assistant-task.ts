import { useState, useRef, useEffect, useCallback } from 'react';
import type { RefObject, MutableRefObject } from 'react';
import type { ContentGeneratorAgentId } from '@/components/editor/extensions/content_generator';
import type { TextEditorElement } from '@/components/editor/TextEditor';
import type { ModelInfo } from '../../../../../shared/types';
import { subscribeToTask } from '../../../services/task-event-bus';
import type { TaskSnapshot } from '../../../services/task-event-bus';
import { buildTaskPrompt, normalizeTaskPromptContext } from '../shared';
import { useTextGeneratorSubmit } from './use-text-generator-submit';
import { useImageGeneratorSubmit } from './use-image-generator-submit';

export interface AssistantTaskHandlers {
	assistantIsRunning: boolean;
	handleGenerateTextSubmit: (prompt: string) => Promise<void>;
	handleGenerateImageSubmit: (prompt: string, files: File[]) => Promise<void>;
	handleContinueWithAssistant: (
		before: string,
		after: string,
		cursorPos: number,
		closeMenu: () => void
	) => void;
}

export function useAssistantTask(
	documentId: string | undefined,
	editorRef: RefObject<TextEditorElement | null>
): AssistantTaskHandlers {
	const writerTask = useTextGeneratorSubmit(documentId);
	const imageTask = useImageGeneratorSubmit(documentId);

	const [assistantActiveTaskId, setAssistantActiveTaskId] = useState<string | null>(null);
	const [assistantActiveAgentId, setAssistantActiveAgentId] =
		useState<ContentGeneratorAgentId>('writer');
	const assistantIsRunning = assistantActiveTaskId !== null;
	const pendingCloseMenuRef = useRef<(() => void) | null>(null);

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
	}, [assistantActiveAgentId, assistantActiveTaskId, editorRef]);

	const handleGenerateTextSubmit = useCallback(
		async (prompt: string) => {
			if (!documentId || assistantIsRunning) {
				editorRef.current?.setAssistantLoading(false);
				editorRef.current?.setAssistantEnable(true);
				return;
			}

			editorRef.current?.setAssistantLoading(true);
			editorRef.current?.setAssistantEnable(false);

			try {
				const taskId = await writerTask.submit({ prompt });

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
		[assistantIsRunning, documentId, editorRef, writerTask]
	);

	const handleGenerateImageSubmit = useCallback(
		async (prompt: string, files: File[]) => {
			if (!documentId || assistantIsRunning) {
				editorRef.current?.setAssistantLoading(false);
				editorRef.current?.setAssistantEnable(true);
				return;
			}

			editorRef.current?.setAssistantLoading(true);
			editorRef.current?.setAssistantEnable(false);

			try {
				const taskId = await imageTask.submit({ prompt, files });

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
		[assistantIsRunning, documentId, editorRef, imageTask]
	);

	const handleContinueWithAssistant = useCallback(
		(before: string, after: string, cursorPos: number, closeMenu: () => void) => {
			if (assistantIsRunning) {
				closeMenu();
				return;
			}
			const { before: cleanBefore, after: cleanAfter } = normalizeTaskPromptContext(before, after);
			pendingCloseMenuRef.current = closeMenu;
			const prompt = buildTaskPrompt(cleanBefore, cleanAfter, 'CONTINUE HERE WITH 15 WORDS MAX');
			handleGenerateTextSubmit(prompt).catch(() => {
				pendingCloseMenuRef.current = null;
				closeMenu();
			});
		},
		[assistantIsRunning, handleGenerateTextSubmit]
	);

	return {
		assistantIsRunning,
		handleGenerateTextSubmit,
		handleGenerateImageSubmit,
		handleContinueWithAssistant,
	};
}
