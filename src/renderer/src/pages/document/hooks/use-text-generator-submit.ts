import { useCallback, useRef, useState } from 'react';
import { v7 as uuidv7 } from 'uuid';
import type { ModelInfo } from '../../../../../shared/types';
import { initTaskMetadata } from '../../../services/task-event-bus';
import { buildTaskPrompt } from '../shared';

interface WriterTaskSubmitParams {
	readonly before: string;
	readonly after: string;
	readonly cursorPos: number;
	readonly input: string;
	readonly model: ModelInfo;
}

interface UseWriterTaskSubmitReturn {
	readonly submit: (params: WriterTaskSubmitParams) => Promise<string | null>;
	readonly sessionId: string | null;
}

export function useWriterTaskSubmit(documentId: string | undefined): UseWriterTaskSubmitReturn {
	const [sessionId, setSessionId] = useState<string | null>(null);
	const sessionIdRef = useRef<string | null>(null);

	const submit = useCallback(
		async (params: WriterTaskSubmitParams): Promise<string | null> => {
			if (!documentId) return null;

			const prompt = buildTaskPrompt(params.before, params.after, params.input);

			const resolvedSessionId = sessionIdRef.current ?? uuidv7();
			if (!sessionIdRef.current) {
				sessionIdRef.current = resolvedSessionId;
				setSessionId(resolvedSessionId);
			}

			if (typeof window.task?.submit !== 'function') return null;

			const taskInput = { prompt };
			const metadata = {
				agentId: 'writer' as const,
				documentId,
				chatId: resolvedSessionId,
				before: params.before,
				after: params.after,
				cursorPos: params.cursorPos,
				referenceImages: [],
				modelId: params.model.modelId,
				provider: params.model.provider,
			};

			const ipcResult = await window.task.submit('agent-writer', taskInput, metadata);
			if (!ipcResult.success) return null;

			const resolvedTaskId = ipcResult.data.taskId;
			initTaskMetadata(resolvedTaskId, metadata);
			return resolvedTaskId;
		},
		[documentId]
	);

	return { submit, sessionId };
}
