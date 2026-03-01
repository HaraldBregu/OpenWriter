import { useState, useEffect, useCallback, useRef } from 'react'
import type { TaskSubmitOptions, TaskPriority } from '../../../shared/types'
import type { TaskStatus, TrackedTaskState } from '@/store/tasksSlice'
import { taskAdded, selectTaskById } from '@/store/tasksSlice'
import { store } from '@/store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseTaskSubmitReturn<TInput = unknown, TResult = unknown> {
  /** Task ID assigned by the main process. Null before submit() is called. */
  taskId: string | null
  /** Current lifecycle status. */
  status: TaskStatus | 'idle'
  /** 0–100 progress, populated by progress events. */
  progress: number
  /** Optional human-readable progress message from the main process. */
  progressMessage: string | undefined
  /** Error message when status === 'error'. */
  error: string | null
  /** Result payload from the completed event, typed by TResult. */
  result: TResult | null
  /** Current queue position when status is 'queued'. */
  queuePosition: number | undefined
  /** Submit the task. Optionally pass an inputOverride to replace the default input for this call. Returns the taskId on success, null on failure. */
  submit: (inputOverride?: TInput) => Promise<string | null>
  /** Cancel the current task. No-op if not running. */
  cancel: () => Promise<void>
  /** Change the priority of the queued task. */
  updatePriority: (priority: TaskPriority) => Promise<void>
  /** Reset hook back to idle state. No-op while a task is active. */
  reset: () => void
}

// Terminal statuses — the task cannot change state again (except via a new submit).
const TERMINAL_STATUSES: ReadonlySet<TaskStatus | 'idle'> = new Set([
  'completed',
  'error',
  'cancelled',
])

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTaskSubmit — manages the full lifecycle of a single task submission.
 * Accepts the task type, input, and options at hook definition time (like
 * a query hook) so the component can call submit() imperatively.
 *
 * Key behaviours:
 *  - Registers ownership in the shared taskStore before events arrive so no
 *    events are dropped between IPC round-trip and subscription setup
 *  - Cleans up its store subscription when the task reaches a terminal state
 *    or the component unmounts
 *  - Gracefully no-ops when window.tasksManager is unavailable (e.g. in tests)
 *  - updatePriority() is best-effort: the main process emits the authoritative state change event
 *
 * @template TInput Type of the task input payload.
 * @template TResult Type of the result from the completed event.
 */
export function useTaskSubmit<TInput = unknown, TResult = unknown>(
  type: string,
  input: TInput,
  options?: TaskSubmitOptions
): UseTaskSubmitReturn<TInput, TResult> {
  // IPC listener is initialized in store/index.ts via setupTaskIpcListener().

  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<TaskStatus | 'idle'>('idle')
  const [progress, setProgress] = useState<number>(0)
  const [progressMessage, setProgressMessage] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TResult | null>(null)
  const [queuePosition, setQueuePosition] = useState<number | undefined>(undefined)

  // Stable ref to the current task ID so store callbacks don't go stale.
  const taskIdRef = useRef<string | null>(null)

  // Unsubscribe handle for the store subscription.
  const unsubRef = useRef<(() => void) | null>(null)

  // Guard: prevents submitting while a task is already active.
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

  // Sync all local state fields from the store snapshot.
  const syncFromStore = useCallback(
    (id: string) => {
      const snap: TrackedTaskState | undefined = taskStore.getTaskSnapshot(id)
      if (!snap) return

      setStatus(snap.status)
      setProgress(snap.progress.percent)
      setProgressMessage(snap.progress.message)
      setQueuePosition(snap.queuePosition)

      if (snap.error !== undefined) setError(snap.error)
      if (snap.result !== undefined) setResult(snap.result as TResult)

      // Tear down the subscription once the task reaches a terminal state.
      // Only terminal statuses stop event tracking.
      if (TERMINAL_STATUSES.has(snap.status)) {
        cleanupSubscription()
      }
    },
    [cleanupSubscription]
  )

  const submit = useCallback(async (inputOverride?: TInput): Promise<string | null> => {
    if (runningRef.current) return null

    if (typeof window.tasksManager?.submit !== 'function') {
      console.warn(
        '[useTaskSubmit] window.tasksManager.submit is not available. ' +
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
    setQueuePosition(undefined)
    runningRef.current = true

    let resolvedTaskId: string

    try {
      const ipcResult = await window.tasksManager.submit(type, inputOverride ?? input, options)

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
    taskStore.addTask(resolvedTaskId, type, options?.priority ?? 'normal')

    // Subscribe to this specific task's store key.
    taskIdRef.current = resolvedTaskId
    setTaskId(resolvedTaskId)

    // Tear down any previous subscription before creating a new one.
    if (unsubRef.current) {
      unsubRef.current()
    }

    unsubRef.current = taskStore.subscribe(resolvedTaskId, () => {
      if (taskIdRef.current) {
        syncFromStore(taskIdRef.current)
      }
    })

    // Replay any events that were applied to the store before subscribe() ran.
    syncFromStore(resolvedTaskId)

    return resolvedTaskId
  }, [type, input, options, syncFromStore])

  const cancel = useCallback(async (): Promise<void> => {
    const id = taskIdRef.current
    if (!id) return
    if (typeof window.tasksManager?.cancel !== 'function') return

    try {
      await window.tasksManager.cancel(id)
    } catch {
      // Best-effort — the cancelled event from the main process will update state.
    }
  }, [])

  const updatePriority = useCallback(async (priority: TaskPriority): Promise<void> => {
    const id = taskIdRef.current
    if (!id) return
    if (typeof window.tasksManager?.updatePriority !== 'function') return

    try {
      await window.tasksManager.updatePriority(id, priority)
    } catch {
      // Best-effort — the priority-changed event from the main process will update state.
    }
  }, [])

  const reset = useCallback((): void => {
    // Only reset when not actively running — avoids dangling subscriptions.
    if (runningRef.current) return
    cleanupSubscription()
    taskIdRef.current = null
    setTaskId(null)
    setStatus('idle')
    setProgress(0)
    setProgressMessage(undefined)
    setError(null)
    setResult(null)
    setQueuePosition(undefined)
  }, [cleanupSubscription])

  return {
    taskId,
    status,
    progress,
    progressMessage,
    error,
    result,
    queuePosition,
    submit,
    cancel,
    updatePriority,
    reset,
  }
}
