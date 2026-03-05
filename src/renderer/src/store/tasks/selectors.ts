/** Tasks state selectors. */
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { TrackedTaskState } from './types';
import type { TaskStatus } from '../../../../shared/types';

const selectTasksArray = (state: RootState) => state.tasks.tasks;

/** All tracked tasks as an array. */
export const selectAllTasks = selectTasksArray;

/** A single task by ID, or undefined if not tracked. */
export const selectTaskById = (state: RootState, taskId: string): TrackedTaskState | undefined =>
	state.tasks.tasks.find((t) => t.taskId === taskId);

/** Memoized selector factory — returns a stable selector instance per taskId. */
export const makeSelectTaskById = (taskId: string) =>
	createSelector(selectTasksArray, (tasks) => tasks.find((t) => t.taskId === taskId));

/** All tasks with a given status. */
export const selectTasksByStatus = createSelector(
	selectTasksArray,
	(_: RootState, status: TaskStatus) => status,
	(tasks, status): TrackedTaskState[] => tasks.filter((t) => t.status === status)
);

/**
 * Queue stats — count of tasks in each terminal/active status bucket.
 * Re-computes only when the tasks array reference changes.
 */
export const selectQueueStats = createSelector(selectTasksArray, (tasks) => {
	const stats = { queued: 0, running: 0, completed: 0, error: 0, cancelled: 0 };
	for (const task of tasks) {
		if (task.status in stats) {
			stats[task.status as keyof typeof stats]++;
		}
	}
	return stats;
});
