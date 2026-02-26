import { useCallback } from 'react'
import { useSyncExternalStore } from 'react'
import type { TaskStatus } from '@/contexts/TaskContext'
import { useTaskContext } from '@/contexts/TaskContext'

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
 *
 * Usage:
 *   const status = useTaskStatus('task-abc-123')
 *   if (status === 'completed') { ... }
 */
export function useTaskStatus(taskId: string): TaskStatusOrUnknown {
  const { store } = useTaskContext()

  // Derive status-only snapshot so changes to progress/stream don't trigger re-renders.
  const status = useSyncExternalStore(
    useCallback((listener) => store.subscribe(taskId, listener), [store, taskId]),
    useCallback((): TaskStatusOrUnknown => {
      const snap = store.getTaskSnapshot(taskId)
      return snap?.status ?? 'unknown'
    }, [store, taskId])
  )

  return status
}
