import { useState, useEffect, useCallback, useRef, useMemo, useSyncExternalStore } from 'react';
import type { TaskSubmitOptions, TaskPriority } from '../../../shared/types';
import { getTaskStatusText } from '../../../shared/task-metadata';
import {
	addTask,
	getTrackedTask,
	removeTask,
	subscribeToTaskStore,
	type TaskStatus,
	type TaskProgressState,
} from '@/services/task-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { TaskStatus, TaskProgressState };

export interface UseTaskSubmitReturn<TInput = unknown, TResult = unknown> {
	/** Task ID assigned by the main process. Null before submit() is called. */
	taskId: string | null;
	/** Current lifecycle status. Null before submit() is called. */
	status: TaskStatus | null;
	/** Task metadata returned by the main process. */
	metadata: Record<string, unknown> | undefined;
	/** Progress state — percent 0–100 and optional message. */
	progress: TaskProgressState;
	/** Optional human-readable progress message from the main process. */
	progressMessage: string | undefined;
	/** Error message when status === 'error'. */
	error: string | undefined;
	/** Result payload from the completed event, typed by TResult. */
	result: TResult | undefined;
	/** Current queue position when status is 'queued'. */
	queuePosition: number | undefined;
	/** Wall-clock duration of the task in milliseconds, set on completion. */
	durationMs: number | undefined;
	/** Submit the task. */
	submit: (
		input: TInput,
		metadata?: Record<string, unknown>,
		options?: TaskOptions
	) => Promise<void>;
	/** Cancel the current task. No-op if not running. */
	cancel: () => void;
	/** Change the priority of the queued task. */
	updatePriority: (priority: TaskPriority) => void;
	/** Reset hook back to idle state. No-op while a task is active. */
	reset: () => void;
	/** True when no task has been submitted yet. */
	isIdle: boolean;
	/** True when status === 'queued'. */
	isQueued: boolean;
	/** True when status is 'started' or 'running' (task is actively executing). */
	isRunning: boolean;
	/** True when status === 'completed'. */
	isCompleted: boolean;
	/** True when status === 'error'. */
	isError: boolean;
	/** True when status === 'cancelled'. */
	isCancelled: boolean;
}

export interface TaskOptions {
	priority?: TaskPriority;
	timeoutMs?: number;
}

const TERMINAL_STATUSES: ReadonlySet<TaskStatus> = new Set(['completed', 'error', 'cancelled']);

/**
 * useTaskSubmit — manages the full lifecycle of a single task submission.
 *
 * Task snapshots come from the renderer-local task store instead of Redux.
 */
export function useTaskSubmit<TInput = unknown, TResult = unknown>(
	type: string,
	input: TInput,
	options?: TaskSubmitOptions
): UseTaskSubmitReturn<TInput, TResult> {
	const [taskId, setTaskId] = useState<string | null>(null);
	const taskIdRef = useRef<string | null>(null);
	const runningRef = useRef<boolean>(false);

	const inputRef = useRef(input);
	inputRef.current = input;
	const optionsRef = useRef(options);
	optionsRef.current = options;

	const taskState = useSyncExternalStore(
		subscribeToTaskStore,
		() => (taskId ? getTrackedTask(taskId) : undefined),
		() => undefined
	);

	const status: TaskStatus | null = taskState?.status ?? null;
	const progressPercent: number = taskState?.progress.percent ?? 0;
	const metadata = taskState?.metadata;
	const progressMessage: string | undefined =
		taskState?.progress.message ?? getTaskStatusText(metadata);
	const error: string | undefined = taskState?.error;
	const result: TResult | undefined = taskState?.result as TResult | undefined;
	const queuePosition: number | undefined = taskState?.queuePosition;
	const durationMs: number | undefined = taskState?.durationMs;

	useEffect(() => {
		if (status !== null && TERMINAL_STATUSES.has(status)) {
			runningRef.current = false;
		}
	}, [status]);

	useEffect(() => {
		return () => {
			runningRef.current = false;
		};
	}, []);

	const submit = useCallback(
		async (
			inputOverride?: TInput,
			metadata?: Record<string, unknown>,
			submitOptions?: TaskOptions
		): Promise<void> => {
			if (runningRef.current) return;

			if (typeof window.task?.submit !== 'function') {
				console.warn(
					'[useTaskSubmit] window.task.submit is not available. ' +
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
					console.error('[useTaskSubmit] IPC submit rejected:', ipcResult.error.message);
					return;
				}

				resolvedTaskId = ipcResult.data.taskId;
			} catch (err) {
				runningRef.current = false;
				console.error('[useTaskSubmit] submit threw:', err);
				return;
			}

			addTask({
				taskId: resolvedTaskId,
				type,
				priority: mergedOptions.priority ?? optionsRef.current?.priority ?? 'normal',
				metadata,
			});

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
			// Best-effort — the cancelled event from the main process will update the task store.
		});
	}, []);

	const updatePriority = useCallback((priority: TaskPriority): void => {
		const id = taskIdRef.current;
		if (!id) return;
		if (typeof window.task?.updatePriority !== 'function') return;

		window.task.updatePriority(id, priority).catch(() => {
			// Best-effort — the priority-changed event from the main process will update the task store.
		});
	}, []);

	const reset = useCallback((): void => {
		if (runningRef.current) return;

		const id = taskIdRef.current;
		if (id) {
			removeTask(id);
		}

		taskIdRef.current = null;
		setTaskId(null);
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
			queuePosition,
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
			progressPercent,
			metadata,
			progressMessage,
			error,
			result,
			queuePosition,
			durationMs,
			submit,
			cancel,
			updatePriority,
			reset,
		]
	);
}
