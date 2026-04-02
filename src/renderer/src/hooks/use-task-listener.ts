import { useState, useEffect, useMemo } from 'react';
import { getTaskStatusText } from '../../../shared/types';
import { subscribeToTask, subscribeToTaskType, getTaskSnapshot } from '@/services/task-event-bus';
import type { TaskSnapshot } from '@/services/task-event-bus';
import type { TaskState } from '../../../shared/types';

export interface UseTaskListenerReturn<TResult = unknown> {
	taskId: string | null;
	status: TaskState | null;
	metadata: Record<string, unknown> | undefined;
	progressMessage: string | undefined;
	error: string | undefined;
	result: TResult | undefined;
	isIdle: boolean;
	isQueued: boolean;
	isRunning: boolean;
	isCompleted: boolean;
	isError: boolean;
	isCancelled: boolean;
}

/**
 * useTaskListener — listens for a task of a given type that may have been
 * started externally (e.g. from the main process).
 *
 * On mount it queries `window.task.list()` for an existing active task,
 * and subscribes to the event bus for new tasks of that type.
 */
export function useTaskListener<TResult = unknown>(
	taskType: string
): UseTaskListenerReturn<TResult> {
	const [taskId, setTaskId] = useState<string | null>(null);
	const [status, setStatus] = useState<TaskState | null>(null);
	const [metadata, setMetadata] = useState<Record<string, unknown> | undefined>(undefined);
	const [error, setError] = useState<string | undefined>(undefined);
	const [result, setResult] = useState<TResult | undefined>(undefined);

	// On mount, check for an existing active task of this type.
	useEffect(() => {
		if (typeof window.task?.list !== 'function') return;

		window.task.list().then((res) => {
			if (!res.success) return;
			const active = res.data.find(
				(t) =>
					t.type === taskType &&
					(t.status === 'queued' || t.status === 'started' || t.status === 'running')
			);
			if (active) {
				setTaskId(active.taskId);
				setStatus(active.status);
				setMetadata(active.metadata);
			}
		});
	}, [taskType]);

	// Listen for new tasks of this type via the event bus.
	useEffect(() => {
		return subscribeToTaskType(taskType, (newTaskId: string) => {
			setTaskId(newTaskId);
			setStatus('queued');
			setMetadata(undefined);
			setError(undefined);
			setResult(undefined);
		});
	}, [taskType]);

	// Subscribe to events for the current taskId.
	useEffect(() => {
		if (taskId === null) return;

		const existing = getTaskSnapshot(taskId);
		if (existing) {
			setStatus(existing.status);
			setMetadata(existing.metadata);
			if (existing.error !== undefined) setError(existing.error);
			if (existing.result !== undefined) setResult(existing.result as TResult);
		}

		return subscribeToTask(taskId, (snap: TaskSnapshot) => {
			setStatus(snap.status);
			setMetadata(snap.metadata);
			setError(snap.error);
			setResult(snap.result as TResult | undefined);
		});
	}, [taskId]);

	const progressMessage = getTaskStatusText(metadata);

	return useMemo(
		() => ({
			taskId,
			status,
			metadata,
			progressMessage,
			error,
			result,
			isIdle: taskId === null,
			isQueued: status === 'queued',
			isRunning: status === 'started' || status === 'running',
			isCompleted: status === 'completed',
			isError: status === 'error',
			isCancelled: status === 'cancelled',
		}),
		[taskId, status, metadata, progressMessage, error, result]
	);
}
