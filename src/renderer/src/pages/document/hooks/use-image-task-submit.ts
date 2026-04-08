import { useCallback, useRef, useState } from 'react';
import { v7 as uuidv7 } from 'uuid';
import { initTaskMetadata } from '../../../services/task-event-bus';
import { buildTaskPrompt } from '../shared';
import type { ModelInfo } from '../../../../../shared/types';

interface SavedImage {
	readonly fileName: string;
	readonly filePath: string;
}

interface ImageTaskSubmitParams {
	readonly before: string;
	readonly after: string;
	readonly cursorPos: number;
	readonly input: string;
	readonly files: File[];
	readonly model: ModelInfo;
}

interface UseImageTaskSubmitReturn {
	readonly submit: (params: ImageTaskSubmitParams) => Promise<string | null>;
	readonly sessionId: string | null;
}

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

async function saveReferenceImages(documentId: string, files: File[]): Promise<SavedImage[]> {
	const saved: SavedImage[] = [];

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

export function useImageTaskSubmit(documentId: string | undefined): UseImageTaskSubmitReturn {
	const [sessionId, setSessionId] = useState<string | null>(null);
	const sessionIdRef = useRef<string | null>(null);

	const submit = useCallback(
		async (params: ImageTaskSubmitParams): Promise<string | null> => {
			if (!documentId) return null;

			const savedReferenceImages =
				params.files.length > 0 ? await saveReferenceImages(documentId, params.files) : [];

			const referenceNote =
				savedReferenceImages.length > 0
					? `\n\nReference images saved in the document:\n${savedReferenceImages
							.map((image) => `- images/${image.fileName}`)
							.join('\n')}`
					: '';

			const prompt = buildTaskPrompt(
				params.before,
				params.after,
				`${params.input}${referenceNote}`
			);

			const resolvedSessionId = sessionIdRef.current ?? uuidv7();
			if (!sessionIdRef.current) {
				sessionIdRef.current = resolvedSessionId;
				setSessionId(resolvedSessionId);
			}

			if (typeof window.task?.submit !== 'function') {
				return null;
			}

			const taskInput = { prompt };
			const metadata = {
				agentId: 'image' as const,
				documentId,
				chatId: resolvedSessionId,
				before: params.before,
				after: params.after,
				cursorPos: params.cursorPos,
				referenceImages: savedReferenceImages,
			};

			const ipcResult = await window.task.submit('agent-image-generator', taskInput, metadata);
			if (!ipcResult.success) return null;

			const resolvedTaskId = ipcResult.data.taskId;
			initTaskMetadata(resolvedTaskId, metadata);
			return resolvedTaskId;
		},
		[documentId]
	);

	return { submit, sessionId };
}
