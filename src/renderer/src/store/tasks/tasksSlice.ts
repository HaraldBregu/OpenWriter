/**
 * @deprecated This file is a compatibility facade.
 * Import from the split files directly:
 *   - Types:     '@/store/tasks/types'
 *   - Actions:   '@/store/tasks/actions'
 *   - Selectors: '@/store/tasks/selectors'
 *   - Reducer:   '@/store/tasks/reducer'
 *   - Barrel:    '@/store/tasks'
 */

export type {
  TaskStatus,
  TaskPriority,
  TaskProgressState,
  TaskEventRecord,
  TrackedTaskState,
  TasksState,
} from './types'

export { tasksSlice, taskAdded, taskEventReceived, taskRemoved } from './reducer'
export { default } from './reducer'

export {
  selectAllTasks,
  selectTaskById,
  selectTasksByStatus,
  selectQueueStats,
} from './selectors'
