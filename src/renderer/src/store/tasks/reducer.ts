/**
 * tasksSlice — Redux Toolkit slice for tracked task state.
 *
 * All tracked task state lives in the Redux store under the `tasks` key so
 * components can use standard useAppSelector hooks.
 *
 * IPC wiring is handled separately in App.tsx, which registers a
 * window.task.onEvent listener at module load time.
 */

import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { TaskEvent, TaskPriority } from '../../../../shared/types'
import { TASK_MAX_EVENT_HISTORY } from '@/constants'
import { initialState } from './state'
import type { TrackedTaskState, TaskEventRecord, TasksState } from './types'

export type { TasksState }

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

      // No-op if already tracked.
      if (state.tasks.some((t) => t.taskId === taskId)) return

      state.tasks.push({
        taskId,
        type,
        status: 'queued',
        priority,
        progress: { percent: 0 },
        streamBuffer: '',
        events: [],
      })
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

      // Auto-create on 'queued' when not yet tracked.
      let task = state.tasks.find((t) => t.taskId === taskId)

      if (!task) {
        if (event.type === 'queued') {
          const newTask: TrackedTaskState = {
            taskId,
            type: event.type === 'queued' ? event.data.taskType : '',
            status: 'queued',
            priority: 'normal',
            progress: { percent: 0 },
            streamBuffer: '',
            events: [],
          }

          state.tasks.push(newTask)
          // Re-assign task to the Immer draft reference just pushed.
          task = state.tasks[state.tasks.length - 1]
        } else {
          return
        }
      }

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
          task.status = 'running'
          task.streamBuffer = (task.streamBuffer ?? '') + event.data.data
          break
        }
        case 'completed': {
          task.status = 'completed'
          task.progress = { percent: 100 }
          task.result = event.data.result
          task.durationMs = event.data.durationMs
          task.queuePosition = undefined
          task.streamBuffer = ''
          break
        }
        case 'error': {
          task.status = 'error'
          task.error = event.data.message
          task.queuePosition = undefined
          task.streamBuffer = ''
          break
        }
        case 'cancelled': {
          task.status = 'cancelled'
          task.queuePosition = undefined
          task.streamBuffer = ''
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
      state.tasks = state.tasks.filter((t) => t.taskId !== action.payload)
    },
  },
})

export const { taskAdded, taskEventReceived, taskRemoved } = tasksSlice.actions

export default tasksSlice.reducer
