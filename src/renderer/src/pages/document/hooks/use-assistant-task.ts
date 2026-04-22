import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { v7 as uuidv7 } from 'uuid';
import type {
	AgentPhase,
	AgentPhasePayload,
	AgentDeltaPayload,
	AgentCompletedOutput,
	AssistantTaskMetadata,
	TaskEvent,
} from '@shared/index';

interface UseAssistantTaskParams {
	documentId: string | null | undefined;
	sessionIdRef: MutableRefObject<string | null>;
	ready: boolean;
	onPhase: (phase: AgentPhase, label: string) => void;
	onDelta: (token: string, fullContent: string) => void;
	onRecovery: (fullContent: string, metadata: AssistantTaskMetadata) => void;
	onCompleted: (content: string) => void;
	onCancelled: () => void;
	onError: (message: string) => void;
}

export interface AssistantTaskSubmitArgs {
	prompt: string;
	files: { name: string; mimeType?: string }[];
	posFrom: number;
	posTo: number;
}

export interface UseAssistantTaskResult {
	isRunning: boolean;
	activeTaskId: string | null;
	submit: (args: AssistantTaskSubmitArgs) => Promise<boolean>;
	cancel: () => Promise<void>;
}

export function useAssistantTask(params: UseAssistantTaskParams): UseAssistantTaskResult {
	const {
		documentId,
		sessionIdRef,
		ready,
		onPhase,
		onDelta,
		onRecovery,
		onCompleted,
		onCancelled,
		onError,
	} = params;

	const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
	const callbacksRef = useRef({ onPhase, onDelta, onRecovery, onCompleted, onCancelled, onError });
	callbacksRef.current = { onPhase, onDelta, onRecovery, onCompleted, onCancelled, onError };

	const activeTaskIdRef = useRef<string | null>(null);
	activeTaskIdRef.current = activeTaskId;

	// Subscribe to task events for the active task.
	useEffect(() => {
		if (typeof window.task?.onEvent !== 'function') return;
		return window.task.onEvent((event: TaskEvent) => {
			const currentId = activeTaskIdRef.current;
			if (!currentId || event.taskId !== currentId) return;
			dispatchEvent(event, callbacksRef.current, () => setActiveTaskId(null));
		});
	}, []);

	// Mount-time recovery: find any existing task tied to this document.
	useEffect(() => {
		if (!documentId || !ready) return;
		if (typeof window.task?.findForDocument !== 'function') return;
		let cancelled = false;

		(async () => {
			const lookup = await window.task.findForDocument(documentId);
			if (cancelled || !lookup.success || !lookup.data) return;
			const found = lookup.data;

			if (isActiveState(found.state)) {
				setActiveTaskId(found.taskId);
				if (typeof window.task.getSnapshot === 'function') {
					const snap = await window.task.getSnapshot(found.taskId);
					if (cancelled) return;
					if (snap.success && snap.data) {
						callbacksRef.current.onRecovery(snap.data.fullContent, snap.data.metadata);
						callbacksRef.current.onPhase(snap.data.phase, labelFor(snap.data.phase));
					}
				}
				return;
			}

			if (found.state === 'completed' && found.result) {
				callbacksRef.current.onRecovery('', found.metadata);
				callbacksRef.current.onCompleted(found.result.content);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [documentId, ready]);

	const submit = useCallback(
		async ({ prompt, files, posFrom, posTo }: AssistantTaskSubmitArgs): Promise<boolean> => {
			if (!documentId) return false;
			if (activeTaskIdRef.current) return false;
			if (typeof window.task?.submit !== 'function') return false;

			const sessionId = sessionIdRef.current ?? uuidv7();
			sessionIdRef.current = sessionId;

			const metadata: AssistantTaskMetadata = {
				sessionId,
				documentId,
				posFrom,
				posTo,
			};

			const result = await window.task.submit({
				type: 'agent',
				input: {
					agentType: 'assistant',
					input: {
						prompt,
						files: files.map((f) => ({ name: f.name, mimeType: f.mimeType })),
					},
				},
				metadata: metadata as unknown as Record<string, unknown>,
			});

			if (!result.success) return false;
			setActiveTaskId(result.data.taskId);
			return true;
		},
		[documentId, sessionIdRef]
	);

	const cancel = useCallback(async (): Promise<void> => {
		const taskId = activeTaskIdRef.current;
		if (!taskId) return;
		if (typeof window.task?.cancel !== 'function') return;
		await window.task.cancel(taskId);
	}, []);

	return {
		isRunning: activeTaskId !== null,
		activeTaskId,
		submit,
		cancel,
	};
}

function isActiveState(state: string): boolean {
	return state === 'queued' || state === 'started' || state === 'running';
}

function labelFor(phase: AgentPhase): string {
	switch (phase) {
		case 'thinking':
			return 'Thinking';
		case 'writing':
			return 'Writing';
		case 'generating-image':
			return 'Generating image';
		case 'completed':
			return 'Done';
		case 'error':
			return 'Error';
		case 'cancelled':
			return 'Cancelled';
		default:
			return 'Queued';
	}
}

interface Callbacks {
	onPhase: (phase: AgentPhase, label: string) => void;
	onDelta: (token: string, fullContent: string) => void;
	onRecovery: (fullContent: string, metadata: AssistantTaskMetadata) => void;
	onCompleted: (content: string) => void;
	onCancelled: () => void;
	onError: (message: string) => void;
}

function dispatchEvent(event: TaskEvent, cb: Callbacks, clearActive: () => void): void {
	if (event.state === 'running') {
		const inner = readInnerEvent(event.data);
		if (!inner) return;
		if (inner.kind === 'phase') {
			const payload = inner.payload as AgentPhasePayload;
			if (payload?.phase) cb.onPhase(payload.phase, payload.label);
		} else if (inner.kind === 'delta') {
			const payload = inner.payload as AgentDeltaPayload;
			if (typeof payload?.token === 'string' && typeof payload?.fullContent === 'string') {
				cb.onDelta(payload.token, payload.fullContent);
			}
		}
		return;
	}

	if (event.state === 'completed') {
		const result = readCompletedResult(event.data);
		if (result) cb.onCompleted(result.content);
		clearActive();
		return;
	}

	if (event.state === 'cancelled') {
		cb.onCancelled();
		clearActive();
		return;
	}

	if (event.state === 'error') {
		const message = readErrorMessage(event.error) ?? 'Task failed';
		cb.onError(message);
		clearActive();
	}
}

interface InnerEvent {
	kind: string;
	payload: unknown;
}

function readInnerEvent(data: unknown): InnerEvent | null {
	if (!data || typeof data !== 'object') return null;
	const event = (data as { event?: unknown }).event;
	if (!event || typeof event !== 'object') return null;
	const { kind, payload } = event as { kind?: unknown; payload?: unknown };
	if (typeof kind !== 'string') return null;
	return { kind, payload };
}

function readCompletedResult(data: unknown): AgentCompletedOutput | null {
	if (!data || typeof data !== 'object') return null;
	const result = (data as { result?: unknown }).result;
	if (!result || typeof result !== 'object') return null;
	const { content, stoppedReason } = result as Record<string, unknown>;
	if (typeof content !== 'string') return null;
	if (stoppedReason !== 'done' && stoppedReason !== 'max-steps' && stoppedReason !== 'stagnation') {
		return null;
	}
	return { content, stoppedReason };
}

function readErrorMessage(error: unknown): string | null {
	if (!error || typeof error !== 'object') return null;
	const message = (error as { message?: unknown }).message;
	return typeof message === 'string' ? message : null;
}
