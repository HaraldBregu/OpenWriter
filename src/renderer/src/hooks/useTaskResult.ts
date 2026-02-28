import { useState, useEffect, useCallback, useRef } from 'react'
import { useSyncExternalStore } from 'react'
import type { TaskInfo } from '../../../shared/types/ipc/types'
import { useTaskContext } from '@/contexts/TaskContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskResultStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface UseTaskResultReturn<TResult = unknown> {
  /** The full TaskInfo including result, completedAt, durationMs, error. */
  taskInfo: TaskInfo | null
  /** The typed result payload extracted from taskInfo. */
  result: TResult | null
  /** Loading/fetch lifecycle for the getResult IPC call. */
  fetchStatus: TaskResultStatus
  /** Error from the IPC call, null otherwise. */
  fetchError: string | null
  /** Manually re-fetch from the main process. */
  refetch: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTaskResult — fetches the persisted result of a completed (or errored)
 * task via window.tasksManager.getResult(taskId). This is useful when:
 *  - A component mounts after the task has already completed
 *  - You need full TaskInfo metadata (completedAt, durationMs) beyond what
 *    the stream event provides
 *
 * Auto-fetches on mount if taskId is provided, and re-fetches whenever the
 * task transitions to 'completed' via the shared TaskStore.
 *
 * @template TResult Type of the result payload inside TaskInfo.
 * @param taskId The ID of the task to retrieve. Hook is idle when undefined.
 *
 * Usage:
 *   const { result, fetchStatus, refetch } = useTaskResult<ExportResult>(taskId)
 *   if (fetchStatus === 'ready') { console.log(result) }
 */
export function useTaskResult<TResult = unknown>(
  taskId: string | undefined
): UseTaskResultReturn<TResult> {
  const { store } = useTaskContext()

  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null)
  const [fetchStatus, setFetchStatus] = useState<TaskResultStatus>('idle')
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Ref to track whether a fetch is already in-flight to avoid concurrent calls.
  const fetchingRef = useRef(false)

  const fetch = useCallback(async (): Promise<void> => {
    if (!taskId) return
    if (fetchingRef.current) return
    if (typeof window.tasksManager?.getResult !== 'function') {
      setFetchStatus('error')
      setFetchError('Task API not available. Check main process registration.')
      return
    }

    fetchingRef.current = true
    setFetchStatus('loading')
    setFetchError(null)

    try {
      const ipcResult = await window.tasksManager.getResult(taskId)

      if (!ipcResult.success) {
        setFetchStatus('error')
        setFetchError(ipcResult.error.message)
        return
      }

      setTaskInfo(ipcResult.data)
      setFetchStatus('ready')
    } catch (err) {
      setFetchStatus('error')
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch task result')
    } finally {
      fetchingRef.current = false
    }
  }, [taskId])

  // Fetch on mount when a taskId is provided.
  useEffect(() => {
    if (!taskId) return
    void fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]) // intentionally omit `fetch` to run only when taskId changes

  // Subscribe to store to detect when the task transitions to 'completed',
  // then auto-fetch the full result from the main process.
  const statusSnapshot = useSyncExternalStore(
    useCallback(
      (listener) => (taskId ? store.subscribe(taskId, listener) : () => {}),
      [store, taskId]
    ),
    useCallback(() => {
      if (!taskId) return undefined
      return store.getTaskSnapshot(taskId)?.status
    }, [store, taskId])
  )

  const prevStatusRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (statusSnapshot === 'completed' && prevStatusRef.current !== 'completed') {
      void fetch()
    }
    prevStatusRef.current = statusSnapshot
  }, [statusSnapshot, fetch])

  const result = (taskInfo?.status === 'completed' ? (taskInfo as unknown as { result?: TResult }).result ?? null : null)

  return { taskInfo, result, fetchStatus, fetchError, refetch: fetch }
}
