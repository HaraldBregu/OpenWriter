import { useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '@/store'
import { selectAllTasks, selectQueueStats, taskRemoved } from '@/store/tasksSlice'
import type { TrackedTaskState } from '@/store/tasksSlice'

export type { TrackedTaskState }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DebugQueueStats {
  queued: number
  running: number
  completed: number
  error: number
  cancelled: number
}

export interface UseDebugTasksReturn {
  tasks: TrackedTaskState[]
  queueStats: DebugQueueStats
  /** Remove a task from the Redux store (UI-only dismissal). */
  hide: (taskId: string) => void
  /** Cancel a running or queued task via IPC. */
  cancel: (taskId: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useDebugTasks — provides a live view of all tracked tasks for the debug panel.
 *
 * Uses useAppSelector for reactive Redux subscriptions instead of the former
 * module-level taskStore singleton. `hide()` dispatches taskRemoved to the
 * Redux store so the task no longer appears anywhere in the UI. `cancel()`
 * makes a best-effort IPC call to the main process.
 */
export function useDebugTasks(): UseDebugTasksReturn {
  const dispatch = useAppDispatch()

  // Both selectors are memoised in tasksSlice via createSelector — they only
  // recompute when the tasks map reference changes in Redux.
  const tasks = useAppSelector(selectAllTasks)
  const queueStats = useAppSelector(selectQueueStats)

  const hide = useCallback(
    (taskId: string) => {
      dispatch(taskRemoved(taskId))
    },
    [dispatch]
  )

  const cancel = useCallback(async (taskId: string): Promise<void> => {
    if (typeof window.tasksManager?.cancel !== 'function') return
    await window.tasksManager.cancel(taskId)
  }, [])

  return { tasks, queueStats, hide, cancel }
}
