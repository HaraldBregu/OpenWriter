import { useState, useEffect, useCallback, useRef } from 'react'
import type { TaskInfo, TaskQueueStatus } from '../../../shared/types/ipc/types'
import { useTaskContext } from '@/contexts/TaskContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueuedTaskInfo extends TaskInfo {
  /** Queue position (1-based). Present when status is 'queued' or 'paused'. */
  queuePosition: number
}

export interface UseTaskQueueReturn {
  /** Tasks currently waiting in the queue, sorted ascending by queuePosition. */
  queuedTasks: QueuedTaskInfo[]
  /** Aggregate queue metrics from the main process. */
  queueStatus: TaskQueueStatus | null
  /** True while the initial queueStatus() call is in-flight. */
  isLoading: boolean
  /** Error from the initial fetch, null otherwise. */
  error: string | null
  /** Re-fetch queue metrics from the main process. */
  refreshQueueStatus: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTaskQueue — provides a live view of all tasks waiting in the queue,
 * sorted by position. Updates automatically when:
 *   - A new task is enqueued ('queued' event)
 *   - A task's position changes ('queue-position' event)
 *   - A task is resumed and re-enters the queue ('resumed' event)
 *   - A task priority changes and its position updates ('priority-changed' event)
 *   - A task starts running and leaves the queue ('started' event)
 *   - A task is cancelled or errors ('cancelled'/'error' events)
 *
 * Also fetches aggregate TaskQueueStatus metrics on mount via window.task.queueStatus().
 *
 * Usage:
 *   const { queuedTasks, queueStatus, isLoading } = useTaskQueue()
 *   return (
 *     <ul>
 *       {queuedTasks.map(t => (
 *         <li key={t.taskId}>#{t.queuePosition} — {t.type} ({t.priority})</li>
 *       ))}
 *     </ul>
 *   )
 */
export function useTaskQueue(): UseTaskQueueReturn {
  const { store } = useTaskContext()

  const [queuedTasks, setQueuedTasks] = useState<QueuedTaskInfo[]>([])
  const [queueStatus, setQueueStatus] = useState<TaskQueueStatus | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Derives the sorted queued-task list from the store's all-tasks snapshot.
  const deriveQueue = useCallback((): QueuedTaskInfo[] => {
    return store
      .getAllTasksSnapshot()
      .filter(
        (t): t is TaskInfo & { queuePosition: number } =>
          (t.status === 'queued' || t.status === 'paused') &&
          t.queuePosition !== undefined
      )
      .map((t) => ({ ...t, queuePosition: t.queuePosition }))
      .sort((a, b) => a.queuePosition - b.queuePosition)
  }, [store])

  // Subscribe to the 'ALL' key so any task mutation triggers a queue re-derivation.
  // The filter inside deriveQueue() means only queued/paused tasks appear in the output.
  useEffect(() => {
    // Hydrate immediately.
    setQueuedTasks(deriveQueue())

    const unsub = store.subscribe('ALL', () => {
      setQueuedTasks(deriveQueue())
    })

    return unsub
  }, [store, deriveQueue])

  // Stable ref to avoid re-running the fetch effect when refreshQueueStatus identity changes.
  const fetchRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const refreshQueueStatus = useCallback(async (): Promise<void> => {
    if (typeof window.task?.queueStatus !== 'function') {
      setError('Task API not available. Check main process registration.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const ipcResult = await window.task.queueStatus()

      if (!ipcResult.success) {
        setError(ipcResult.error.message)
        return
      }

      setQueueStatus(ipcResult.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch queue status')
    } finally {
      setIsLoading(false)
    }
  }, [])

  fetchRef.current = refreshQueueStatus

  // Fetch queue metrics on mount.
  useEffect(() => {
    void fetchRef.current()
  }, [])

  return { queuedTasks, queueStatus, isLoading, error, refreshQueueStatus }
}
