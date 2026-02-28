import { useState, useEffect, useCallback, useRef } from 'react'
import type { TaskInfo, TaskQueueStatus } from '../../../shared/types/ipc/types'
import { taskStore } from '@/services/taskStore'

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
 * sorted by position. Updates automatically when task events arrive.
 *
 * Also fetches aggregate TaskQueueStatus metrics on mount via
 * window.tasksManager.queueStatus().
 */
export function useTaskQueue(): UseTaskQueueReturn {
  taskStore.ensureListening()

  const [queuedTasks, setQueuedTasks] = useState<QueuedTaskInfo[]>([])
  const [queueStatus, setQueueStatus] = useState<TaskQueueStatus | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Derives the sorted queued-task list from the store's all-tasks snapshot.
  const deriveQueue = useCallback((): QueuedTaskInfo[] => {
    return taskStore
      .getAllTasksSnapshot()
      .filter(
        (t): t is TaskInfo & { queuePosition: number } =>
          (t.status === 'queued' || t.status === 'paused') &&
          t.queuePosition !== undefined
      )
      .map((t) => ({ ...t, queuePosition: t.queuePosition }))
      .sort((a, b) => a.queuePosition - b.queuePosition)
  }, [])

  // Subscribe to the 'ALL' key so any task mutation triggers a queue re-derivation.
  useEffect(() => {
    setQueuedTasks(deriveQueue())

    const unsub = taskStore.subscribe('ALL', () => {
      setQueuedTasks(deriveQueue())
    })

    return unsub
  }, [deriveQueue])

  // Stable ref to avoid re-running the fetch effect when refreshQueueStatus identity changes.
  const fetchRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const refreshQueueStatus = useCallback(async (): Promise<void> => {
    if (typeof window.tasksManager?.queueStatus !== 'function') {
      setError('Task API not available. Check main process registration.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const ipcResult = await window.tasksManager.queueStatus()

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
