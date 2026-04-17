import { useState, useEffect, useCallback } from 'react';
import type { RefObject } from 'react';

type ContentGeneratorAgentId = 'text' | 'image';
import { subscribeToTask } from '../../../services/task-event-bus';
import type { TaskSnapshot } from '../../../services/task-event-bus';
import { useTextGeneratorSubmit } from './use-text-generator-submit';
import { useImageGeneratorSubmit } from './use-image-generator-submit';
import { EditorElement } from '@/components/app/editor/Editor';

export interface AssistantTaskHandlers {
	assistantIsRunning: boolean;
	handleGenerateTextSubmit: (prompt: string) => Promise<void>;
	handleGenerateImageSubmit: (prompt: string, files: File[]) => Promise<void>;
}

export function useAssistantTask(
	documentId: string | undefined,
	editorRef: RefObject<EditorElement | null>
): AssistantTaskHandlers {
	const textTask = useTextGeneratorSubmit(documentId);
	const imageTask = useImageGeneratorSubmit(documentId);

	const [assistantActiveTaskId, setAssistantActiveTaskId] = useState<string | null>(null);
	const [assistantActiveAgentId, setAssistantActiveAgentId] =
		useState<ContentGeneratorAgentId>('text');
	const assistantIsRunning = assistantActiveTaskId !== null;

	useEffect(() => {
		if (!assistantActiveTaskId) return;

		const unsub = subscribeToTask(assistantActiveTaskId, (snap: TaskSnapshot) => {
			if (snap.status === 'started') {
				editorRef.current?.setAssistantLoading(true);
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
				const taskId = await textTask.submit({ prompt });

				if (!taskId) {
					editorRef.current?.setAssistantLoading(false);
					editorRef.current?.setAssistantEnable(true);
					return;
				}

				setAssistantActiveAgentId('text');
				setAssistantActiveTaskId(taskId);
			} catch {
				editorRef.current?.setAssistantLoading(false);
				editorRef.current?.setAssistantEnable(true);
			}
		},
		[assistantIsRunning, documentId, editorRef, textTask]
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

	return {
		assistantIsRunning,
		handleGenerateTextSubmit,
		handleGenerateImageSubmit,
	};
}
