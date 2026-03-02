import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import type { TrackedTaskState } from './types'
import type { TaskStatus } from '../../../../shared/types'

const selectTasksMap = (state: RootState) => state.tasks.tasks

/** All tracked tasks as an array. */
export const selectAllTasks = createSelector(
  selectTasksMap,
  (tasks): TrackedTaskState[] => Object.values(tasks)
)

/** A single task by ID, or undefined if not tracked. */
export const selectTaskById = (state: RootState, taskId: string): TrackedTaskState | undefined =>
  state.tasks.tasks[taskId]

/** All tasks with a given status. */
export const selectTasksByStatus = createSelector(
  selectTasksMap,
  (_: RootState, status: TaskStatus) => status,
  (tasks, status): TrackedTaskState[] =>
    Object.values(tasks).filter((t) => t.status === status)
)

/**
 * Queue stats — count of tasks in each terminal/active status bucket.
 * Re-computes only when the tasks map reference changes.
 */
export const selectQueueStats = createSelector(selectTasksMap, (tasks) => {
  const stats = { queued: 0, running: 0, completed: 0, error: 0, cancelled: 0 }
  for (const task of Object.values(tasks)) {
    if (task.status in stats) {
      stats[task.status as keyof typeof stats]++
    }
  }
  return stats
})
