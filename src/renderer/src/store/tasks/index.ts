// Types
export type {
  TaskStatus,
  TaskPriority,
  TaskProgressState,
  TaskEventRecord,
  TrackedTaskState,
  TasksState,
} from './types'

// State
export { initialState } from './state'

// Reducer & slice
export { tasksSlice, taskAdded, taskEventReceived, taskRemoved } from './reducer'
export { default } from './reducer'

// Actions (convenience re-export)
export { taskAdded as taskAddedAction, taskEventReceived as taskEventReceivedAction, taskRemoved as taskRemovedAction } from './actions'

// Selectors
export {
  selectAllTasks,
  selectTaskById,
  selectTasksByStatus,
  selectQueueStats,
} from './selectors'
