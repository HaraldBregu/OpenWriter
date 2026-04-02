import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { TaskSubmitOptions, TaskPriority } from '../../../shared/types';
import { getTaskStatusText } from '../../../shared/types';
import { subscribeToTask, getTaskSnapshot } from '@/services/task-event-bus';
import type { TaskSnapshot } from '@/services/task-event-bus';
import type { TaskState, TaskProgressState } from '@/services/task-store';
import type { UseTaskSubmitReturn, TaskOptions } from './use-task-submit';

// Terminal statuses — the task cannot change state again (except via a new submit).
const TERMINAL_STATUSES: ReadonlySet<TaskState> = new Set(['completed', 'error', 'cancelled']);

/**
 * useTask — manages the full lifecycle of a single task submission using
 * local state + taskEventBus instead of Redux.
 *
 * Same API as useTaskSubmit but avoids Redux re-render cascades — this hook
 * only re-renders when its own local state changes.
 *
 * Note: Progress (percent/message) is not available from TaskSnapshot.
 * Progress defaults to 0/undefined. Use useTaskSubmit if you need progress.
 */
export function useTask<TInput = unknown, TResult = unknown>(
	type: string,
	input: TInput,
	options?: TaskSubmitOptions
): UseTaskSubmitReturn<TInput, TResult> {
	// Local state — replaces Redux-derived fields.
	const [taskId, setTaskId] = useState<string | null>(null);
	const [status, setStatus] = useState<TaskState | null>(null);
	const [metadata, setMetadata] = useState<Record<string, unknown> | undefined>(undefined);
	const [error, setError] = useState<string | undefined>(undefined);
	const [result, setResult] = useState<TResult | undefined>(undefined);

	// Progress not available from TaskSnapshot — always defaults.
	const progressPercent = 0;
	const progressMessage: string | undefined = getTaskStatusText(metadata);
	// Duration not available from TaskSnapshot.
	const durationMs: number | undefined = undefined;

	// Refs for stable callbacks.
	const taskIdRef = useRef<string | null>(null);
	const runningRef = useRef<boolean>(false);
	const inputRef = useRef(input);
	inputRef.current = input;
	const optionsRef = useRef(options);
	optionsRef.current = options;

	// Ref to track previous snapshot values and skip no-op setStates.
	const prevSnapRef = useRef<{
		status: string | null;
		metadata: Record<string, unknown> | undefined;
		error: string | undefined;
		result: unknown | undefined;
	}>({ status: null, metadata: undefined, error: undefined, result: undefined });

	// Release the running guard once a terminal status is observed.
	useEffect(() => {
		if (status !== null && TERMINAL_STATUSES.has(status)) {
			runningRef.current = false;
		}
	}, [status]);

	// On unmount, release the running guard.
	useEffect(() => {
		return () => {
			runningRef.current = false;
		};
	}, []);

	// Subscribe to task events when taskId changes.
	useEffect(() => {
		if (taskId === null) return;

		// Read current snapshot in case events arrived before subscription.
		const existing = getTaskSnapshot(taskId);
		if (existing) {
			const prev = prevSnapRef.current;
			if (existing.status !== prev.status) {
				setStatus(existing.status);
			}
			if (existing.metadata !== prev.metadata) {
				setMetadata(existing.metadata);
			}
			if (existing.error !== prev.error) {
				setError(existing.error);
			}
			if (existing.result !== prev.result) {
				setResult(existing.result as TResult | undefined);
			}
			prevSnapRef.current = {
				status: existing.status,
				metadata: existing.metadata,
				error: existing.error,
				result: existing.result,
			};
		}

		const unsub = subscribeToTask(taskId, (snap: TaskSnapshot) => {
			const prev = prevSnapRef.current;

			if (snap.status !== prev.status) {
				setStatus(snap.status);
			}
			if (snap.metadata !== prev.metadata) {
				setMetadata(snap.metadata);
			}
			if (snap.error !== prev.error) {
				setError(snap.error);
			}
			if (snap.result !== prev.result) {
				setResult(snap.result as TResult | undefined);
			}

			prevSnapRef.current = {
				status: snap.status,
				metadata: snap.metadata,
				error: snap.error,
				result: snap.result,
			};
		});

		return unsub;
	}, [taskId]);

	const submit = useCallback(
		async (
			inputOverride?: TInput,
			metadata?: Record<string, unknown>,
			submitOptions?: TaskOptions
		): Promise<void> => {
			if (runningRef.current) return;

			if (typeof window.task?.submit !== 'function') {
				console.warn(
					'[useTask] window.task.submit is not available. ' +
						'The main-process task IPC handlers have not been registered yet.'
				);
				return;
			}

			runningRef.current = true;

			const mergedOptions: TaskSubmitOptions = {
				...optionsRef.current,
				...submitOptions,
			};

			let resolvedTaskId: string;

			try {
				const ipcResult = await window.task.submit(
					type,
					inputOverride ?? inputRef.current,
					metadata,
					mergedOptions
				);

				if (!ipcResult.success) {
					runningRef.current = false;
					console.error('[useTask] IPC submit rejected:', ipcResult.error.message);
					return;
				}

				resolvedTaskId = ipcResult.data.taskId;
			} catch (err) {
				runningRef.current = false;
				console.error('[useTask] submit threw:', err);
				return;
			}

			// Reset prev snapshot ref for the new task.
			prevSnapRef.current = {
				status: null,
				metadata: undefined,
				error: undefined,
				result: undefined,
			};

			// Set initial status to queued.
			setStatus('queued');
			setMetadata(undefined);
			setError(undefined);
			setResult(undefined);

			taskIdRef.current = resolvedTaskId;
			setTaskId(resolvedTaskId);
		},
		[type]
	);

	const cancel = useCallback((): void => {
		const id = taskIdRef.current;
		if (!id) return;
		if (typeof window.task?.cancel !== 'function') return;

		window.task.cancel(id).catch(() => {
			// Best-effort — the cancelled event will update local state via subscription.
		});
	}, []);

	const updatePriority = useCallback((priority: TaskPriority): void => {
		const id = taskIdRef.current;
		if (!id) return;
		if (typeof window.task?.updatePriority !== 'function') return;

		window.task.updatePriority(id, priority).catch(() => {
			// Best-effort.
		});
	}, []);

	const reset = useCallback((): void => {
		// Prevent resetting while a task is still active.
		if (runningRef.current) return;

		taskIdRef.current = null;
		prevSnapRef.current = {
			status: null,
			metadata: undefined,
			error: undefined,
			result: undefined,
		};
		setTaskId(null);
		setStatus(null);
		setMetadata(undefined);
		setError(undefined);
		setResult(undefined);
	}, []);

	return useMemo(
		() => ({
			taskId,
			status,
			metadata,
			progress: { percent: progressPercent, message: progressMessage } as TaskProgressState,
			progressMessage,
			error,
			result,
			durationMs,
			submit,
			cancel,
			updatePriority,
			reset,
			isIdle: taskId === null,
			isQueued: status === 'queued',
			isRunning: status === 'started' || status === 'running',
			isCompleted: status === 'completed',
			isError: status === 'error',
			isCancelled: status === 'cancelled',
		}),
		[
			taskId,
			status,
			metadata,
			progressMessage,
			durationMs,
			error,
			result,
			submit,
			cancel,
			updatePriority,
			reset,
		]
	);
}
