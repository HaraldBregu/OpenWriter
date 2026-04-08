import { useCallback, useRef, useState } from 'react';
import { v7 as uuidv7 } from 'uuid';
import { initTaskMetadata } from '../../../services/task-event-bus';

interface SavedImage {
	readonly fileName: string;
	readonly filePath: string;
}

interface ImageGeneratorSubmitParams {
	readonly prompt: string;
	readonly files: File[];
}

interface UseImageGeneratorSubmitReturn {
	readonly submit: (params: ImageGeneratorSubmitParams) => Promise<string | null>;
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

export function useImageGeneratorSubmit(
	documentId: string | undefined
): UseImageGeneratorSubmitReturn {
	const [sessionId, setSessionId] = useState<string | null>(null);
	const sessionIdRef = useRef<string | null>(null);

	const submit = useCallback(
		async (params: ImageGeneratorSubmitParams): Promise<string | null> => {
			if (!documentId) return null;

			const savedReferenceImages =
				params.files.length > 0 ? await saveReferenceImages(documentId, params.files) : [];

			const referenceNote =
				savedReferenceImages.length > 0
					? `\n\nReference images saved in the document:\n${savedReferenceImages
							.map((image) => `- images/${image.fileName}`)
							.join('\n')}`
					: '';

			const prompt = referenceNote ? `${params.prompt}${referenceNote}` : params.prompt;

			const resolvedSessionId = sessionIdRef.current ?? uuidv7();
			if (!sessionIdRef.current) {
				sessionIdRef.current = resolvedSessionId;
				setSessionId(resolvedSessionId);
			}

			if (typeof window.task?.submit !== 'function') {
				return null;
			}

			const taskInput = {
				prompt,
			};
			const metadata = {
				agentId: 'image' as const,
				documentId,
				chatId: resolvedSessionId,
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
