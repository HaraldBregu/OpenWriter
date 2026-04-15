import { useCallback, useRef, useState } from 'react';
import { v7 as uuidv7 } from 'uuid';
import { initTaskMetadata } from '../../../services/task-event-bus';

interface TextGeneratorSubmitParams {
	readonly prompt: string;
}

interface UseTextGeneratorSubmitReturn {
	readonly submit: (params: TextGeneratorSubmitParams) => Promise<string | null>;
	readonly sessionId: string | null;
}

export function useTextGeneratorSubmit(
	documentId: string | undefined
): UseTextGeneratorSubmitReturn {
	const [sessionId, setSessionId] = useState<string | null>(null);
	const sessionIdRef = useRef<string | null>(null);

	const submit = useCallback(
		async (params: TextGeneratorSubmitParams): Promise<string | null> => {
			if (!documentId) return null;

			const resolvedSessionId = sessionIdRef.current ?? uuidv7();
			if (!sessionIdRef.current) {
				sessionIdRef.current = resolvedSessionId;
				setSessionId(resolvedSessionId);
			}

			if (typeof window.task?.submit !== 'function') return null;

			const taskInput = {
				prompt: params.prompt,
			};
			const metadata = {
				agentId: 'text' as const,
				documentId,
				chatId: resolvedSessionId,
				referenceImages: [],
			};

			const ipcResult = await window.task.submit('agent-text', taskInput, metadata);
			if (!ipcResult.success) return null;

			const resolvedTaskId = ipcResult.data.taskId;
			initTaskMetadata(resolvedTaskId, metadata);
			return resolvedTaskId;
		},
		[documentId]
	);

	return { submit, sessionId };
}
