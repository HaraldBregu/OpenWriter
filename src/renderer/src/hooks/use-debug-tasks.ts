import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
	getTrackedTasks,
	removeTask,
	subscribeToTaskStore,
	type TrackedTaskQueueStats,
	type TrackedTaskState,
} from '@/services/task-store';

export type { TrackedTaskState };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DebugQueueStats = TrackedTaskQueueStats;

export interface UseDebugTasksReturn {
	tasks: TrackedTaskState[];
	queueStats: DebugQueueStats;
	/** Remove a task from the renderer-local task store (UI-only dismissal). */
	hide: (taskId: string) => void;
	/** Cancel a running or queued task via IPC. */
	cancel: (taskId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useDebugTasks — provides a live view of all tracked tasks for the debug panel.
 *
 * Uses the renderer-local task store for reactive subscriptions. `hide()`
 * removes a task from that store so it no longer appears in the debug UI.
 * `cancel()` makes a best-effort IPC call to the main process.
 */
export function useDebugTasks(): UseDebugTasksReturn {
	const tasks = useSyncExternalStore(subscribeToTaskStore, getTrackedTasks, getTrackedTasks);
	const queueStats = useMemo(
		() =>
			tasks.reduce<DebugQueueStats>(
				(stats, task) => {
					if (task.status in stats) {
						stats[task.status as keyof DebugQueueStats] += 1;
					}
					return stats;
				},
				{ queued: 0, running: 0, completed: 0, error: 0, cancelled: 0 }
			),
		[tasks]
	);

	const hide = useCallback((taskId: string) => {
		removeTask(taskId);
	}, []);

	const cancel = useCallback(async (taskId: string): Promise<void> => {
		if (typeof window.task?.cancel !== 'function') return;
		await window.task.cancel(taskId);
	}, []);

	return { tasks, queueStats, hide, cancel };
}
