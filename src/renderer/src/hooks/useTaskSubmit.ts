import { useState, useEffect, useCallback, useRef } from 'react'
import type { TaskSubmitOptions } from '../../../shared/types/ipc/types'
import type { TaskStatus, TrackedTaskState } from '@/contexts/TaskContext'
import { useTaskContext } from '@/contexts/TaskContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseTaskSubmitReturn<TResult = unknown> {
  /** Task ID assigned by the main process. Null before submit() is called. */
  taskId: string | null
  /** Current lifecycle status. */
  status: TaskStatus | 'idle'
  /** 0–100 progress, populated by progress events. */
  progress: number
  /** Optional progress message from the main process. */
  progressMessage: string | undefined
  /** Error message when status === 'error'. */
  error: string | null
  /** Result payload from the completed event, typed by TResult. */
  result: TResult | null
  /** Accumulated streamed content (for streaming tasks). */
  streamedContent: string
  /** Submit the task. Returns the taskId on success, null on failure. */
  submit: () => Promise<string | null>
  /** Cancel the current task. No-op if not running. */
  cancel: () => Promise<void>
  /** Reset hook back to idle state. No-op while a task is running. */
  reset: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTaskSubmit — manages the full lifecycle of a single task submission.
 * Accepts the task type, input, and options at hook definition time (like
 * a query hook) so the component can call submit() imperatively.
 *
 * Key behaviours:
 *  - Registers ownership in the shared TaskStore before events arrive
 *  - Auto-buffers events that arrive before the taskId is resolved
 *  - Cleans up its store subscription on unmount
 *  - Gracefully no-ops when window.task is unavailable (e.g. in tests)
 *
 * @template TInput Type of the task input payload.
 * @template TResult Type of the result from the completed event.
 *
 * Usage:
 *   const { submit, status, progress, result, cancel } = useTaskSubmit(
 *     'file-export',
 *     { path: '/tmp/out.md' },
 *     { priority: 'high' }
 *   )
 *   await submit()
 */
export function useTaskSubmit<TInput = unknown, TResult = unknown>(
  type: string,
  input: TInput,
  options?: TaskSubmitOptions
): UseTaskSubmitReturn<TResult> {
  const { store } = useTaskContext()

  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<TaskStatus | 'idle'>('idle')
  const [progress, setProgress] = useState<number>(0)
  const [progressMessage, setProgressMessage] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TResult | null>(null)
  const [streamedContent, setStreamedContent] = useState<string>('')

  // Stable ref to the current task ID so store callbacks don't go stale.
  const taskIdRef = useRef<string | null>(null)

  // Unsubscribe handle for the store subscription.
  const unsubRef = useRef<(() => void) | null>(null)

  // Guard: prevents submitting while already running.
  const runningRef = useRef<boolean>(false)

  // Clean up the store subscription for the current task.
  const cleanupSubscription = useCallback(() => {
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }
    runningRef.current = false
  }, [])

  // Ensure subscription is torn down when the component unmounts.
  useEffect(() => {
    return () => {
      cleanupSubscription()
    }
  }, [cleanupSubscription])

  // Sync local state from the store snapshot whenever this task's entry changes.
  const syncFromStore = useCallback(
    (id: string) => {
      const snap: TrackedTaskState | undefined = store.getTaskSnapshot(id)
      if (!snap) return

      setStatus(snap.status)
      setProgress(snap.progress.percent)
      setProgressMessage(snap.progress.message)

      if (snap.error !== undefined) setError(snap.error)
      if (snap.result !== undefined) setResult(snap.result as TResult)
      if (snap.streamedContent) setStreamedContent(snap.streamedContent)

      // Tear down when the task reaches a terminal state.
      if (snap.status === 'completed' || snap.status === 'error' || snap.status === 'cancelled') {
        cleanupSubscription()
      }
    },
    [store, cleanupSubscription]
  )

  const submit = useCallback(async (): Promise<string | null> => {
    if (runningRef.current) return null

    if (typeof window.task?.submit !== 'function') {
      console.warn(
        '[useTaskSubmit] window.task.submit is not available. ' +
          'The main-process task IPC handlers have not been registered yet.'
      )
      setStatus('error')
      setError('Task API not available. Check main process registration.')
      return null
    }

    // Reset state for a fresh submission.
    setStatus('queued')
    setProgress(0)
    setProgressMessage(undefined)
    setError(null)
    setResult(null)
    setStreamedContent('')
    runningRef.current = true

    let resolvedTaskId: string

    try {
      const ipcResult = await window.task.submit(type, input, options)

      if (!ipcResult.success) {
        runningRef.current = false
        setStatus('error')
        setError(ipcResult.error.message)
        return null
      }

      resolvedTaskId = ipcResult.data.taskId
    } catch (err) {
      runningRef.current = false
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to submit task')
      return null
    }

    // Register task in the shared store so incoming events are accepted.
    store.addTask(resolvedTaskId, type)

    // Subscribe to this specific task's store key.
    taskIdRef.current = resolvedTaskId
    setTaskId(resolvedTaskId)

    // Tear down any previous subscription before creating a new one.
    if (unsubRef.current) {
      unsubRef.current()
    }

    unsubRef.current = store.subscribe(resolvedTaskId, () => {
      if (taskIdRef.current) {
        syncFromStore(taskIdRef.current)
      }
    })

    // Replay any events that were applied to the store before subscribe() ran.
    syncFromStore(resolvedTaskId)

    return resolvedTaskId
  }, [store, type, input, options, syncFromStore])

  const cancel = useCallback(async (): Promise<void> => {
    const id = taskIdRef.current
    if (!id) return

    if (typeof window.task?.cancel !== 'function') return

    try {
      await window.task.cancel(id)
    } catch {
      // Best-effort — the cancelled event from the main process will update state.
    }
  }, [])

  const reset = useCallback((): void => {
    // Only reset when not actively running — avoids dangling subscriptions.
    if (runningRef.current) return
    taskIdRef.current = null
    setTaskId(null)
    setStatus('idle')
    setProgress(0)
    setProgressMessage(undefined)
    setError(null)
    setResult(null)
    setStreamedContent('')
  }, [])

  return {
    taskId,
    status,
    progress,
    progressMessage,
    error,
    result,
    streamedContent,
    submit,
    cancel,
    reset,
  }
}
