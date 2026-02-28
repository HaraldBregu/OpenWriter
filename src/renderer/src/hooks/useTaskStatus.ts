import { useCallback } from 'react'
import { useSyncExternalStore } from 'react'
import type { TaskStatus } from '@/services/taskStore'
import { taskStore } from '@/services/taskStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskStatusOrUnknown = TaskStatus | 'unknown'

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTaskStatus — lightweight hook that returns only the status of a single
 * task. Uses useSyncExternalStore for surgical re-rendering: this component
 * re-renders only when the task's status field changes, not on every progress
 * tick or stream token.
 *
 * @param taskId The ID of the task to track.
 * @returns The current status string, or 'unknown' if the task is not in the store.
 */
export function useTaskStatus(taskId: string): TaskStatusOrUnknown {
  taskStore.ensureListening()

  // Derive status-only snapshot so changes to progress/stream don't trigger re-renders.
  const status = useSyncExternalStore(
    useCallback((listener) => taskStore.subscribe(taskId, listener), [taskId]),
    useCallback((): TaskStatusOrUnknown => {
      const snap = taskStore.getTaskSnapshot(taskId)
      return snap?.status ?? 'unknown'
    }, [taskId])
  )

  return status
}
