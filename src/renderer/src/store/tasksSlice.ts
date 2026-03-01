/**
 * tasksSlice — Redux Toolkit slice that replaces the module-level taskStore.ts
 * singleton. All tracked task state now lives in the Redux store under the
 * `tasks` key so components can use standard useAppSelector hooks.
 *
 * IPC wiring is handled separately by setupTaskIpcListener() in
 * taskListenerMiddleware.ts, which must be called once after the store is
 * created.
 */

import { createSlice, createSelector } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { TaskEvent, TaskPriority, TaskStatus } from '../../../shared/types'
import { TASK_MAX_EVENT_HISTORY } from '@/constants'
import type { RootState } from './index'

// Re-export shared types so consumers can import everything from this single module.
export type { TaskStatus, TaskPriority } from '../../../shared/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TaskProgressState {
  percent: number
  message?: string
  detail?: unknown
}

export interface TaskEventRecord {
  type: TaskEvent['type']
  data: TaskEvent['data']
  receivedAt: number
}

export interface TrackedTaskState {
  taskId: string
  type: string
  status: TaskStatus
  priority: TaskPriority
  progress: TaskProgressState
  queuePosition?: number
  durationMs?: number
  error?: string
  result?: unknown
  events: TaskEventRecord[]
}

export interface TasksState {
  tasks: Record<string, TrackedTaskState>
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: TasksState = {
  tasks: {},
}

// ---------------------------------------------------------------------------
// Helpers (run inside Immer-wrapped reducers, so mutations are safe here)
// ---------------------------------------------------------------------------

const MAX_EVENT_HISTORY = TASK_MAX_EVENT_HISTORY

/**
 * Append an event record to a task's ring buffer. Operates on the draft task
 * produced by Immer — the caller is responsible for passing the mutable draft.
 */
function appendEventToDraft(task: TrackedTaskState, record: TaskEventRecord): void {
  if (task.events.length >= MAX_EVENT_HISTORY) {
    task.events.shift()
  }
  task.events.push(record)
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    /**
     * Register a new task in the store. If the taskId already exists this is a
     * no-op, matching the previous singleton's behaviour.
     */
    taskAdded(
      state,
      action: PayloadAction<{ taskId: string; type: string; priority?: TaskPriority }>
    ) {
      const { taskId, type, priority = 'normal' } = action.payload
      if (state.tasks[taskId]) return

      state.tasks[taskId] = {
        taskId,
        type,
        status: 'queued',
        priority,
        progress: { percent: 0 },
        events: [],
      }
    },

    /**
     * Process a raw IPC task event and update the relevant task's state.
     * Mirrors applyEvent() from the old taskStore singleton.
     *
     * If the event is 'queued' and the task is not yet tracked it will be
     * auto-created (the main process may send 'queued' before the renderer
     * calls taskAdded). Any other event for an unknown task is silently
     * ignored.
     */
    taskEventReceived(state, action: PayloadAction<TaskEvent>) {
      const event = action.payload
      const data = event.data as { taskId: string }
      const taskId = data?.taskId
      if (!taskId) return

      // Auto-create on 'queued' when not yet tracked
      if (!state.tasks[taskId]) {
        if (event.type === 'queued') {
          state.tasks[taskId] = {
            taskId,
            type: '',
            status: 'queued',
            priority: 'normal',
            progress: { percent: 0 },
            events: [],
          }
        } else {
          return
        }
      }

      const task = state.tasks[taskId]

      const record: TaskEventRecord = {
        type: event.type,
        data: event.data,
        receivedAt: Date.now(),
      }
      appendEventToDraft(task, record)

      switch (event.type) {
        case 'queued': {
          task.status = 'queued'
          task.queuePosition = event.data.position
          break
        }
        case 'started': {
          task.status = 'running'
          task.queuePosition = undefined
          break
        }
        case 'progress': {
          task.status = 'running'
          task.progress = {
            percent: event.data.percent,
            message: event.data.message,
            detail: event.data.detail,
          }
          break
        }
        case 'stream': {
          // Raw batch — do NOT accumulate here. The AI layer subscribes
          // directly to window.tasksManager.onEvent for streaming content.
          task.status = 'running'
          break
        }
        case 'completed': {
          task.status = 'completed'
          task.progress = { percent: 100 }
          task.result = event.data.result
          task.durationMs = event.data.durationMs
          task.queuePosition = undefined
          break
        }
        case 'error': {
          task.status = 'error'
          task.error = event.data.message
          task.queuePosition = undefined
          break
        }
        case 'cancelled': {
          task.status = 'cancelled'
          task.queuePosition = undefined
          break
        }
        case 'priority-changed': {
          task.priority = event.data.priority
          task.queuePosition = event.data.position
          break
        }
        case 'queue-position': {
          task.queuePosition = event.data.position
          break
        }
      }
    },

    /**
     * Remove a task from the store entirely (e.g. after user dismisses it).
     */
    taskRemoved(state, action: PayloadAction<string>) {
      delete state.tasks[action.payload]
    },
  },
})

export const { taskAdded, taskEventReceived, taskRemoved } = tasksSlice.actions

export default tasksSlice.reducer

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const selectTasksState = (state: RootState) => state.tasks.tasks

/** All tracked tasks as an array. */
export const selectAllTasks = createSelector(
  selectTasksState,
  (tasks): TrackedTaskState[] => Object.values(tasks)
)

/** A single task by ID, or undefined if not tracked. */
export const selectTaskById = (state: RootState, taskId: string): TrackedTaskState | undefined =>
  state.tasks.tasks[taskId]

/** All tasks with a given status. */
export const selectTasksByStatus = createSelector(
  selectTasksState,
  (_: RootState, status: TaskStatus) => status,
  (tasks, status): TrackedTaskState[] =>
    Object.values(tasks).filter((t) => t.status === status)
)

/**
 * Queue stats — count of tasks in each terminal/active status bucket.
 * Re-computes only when the tasks map reference changes.
 */
export const selectQueueStats = createSelector(selectTasksState, (tasks) => {
  const stats = { queued: 0, running: 0, completed: 0, error: 0, cancelled: 0 }
  for (const task of Object.values(tasks)) {
    if (task.status in stats) {
      stats[task.status as keyof typeof stats]++
    }
  }
  return stats
})
