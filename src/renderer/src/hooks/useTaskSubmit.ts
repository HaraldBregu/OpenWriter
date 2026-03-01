import { useState, useEffect, useCallback, useRef } from 'react'
import type { TaskSubmitOptions, TaskPriority } from '../../../shared/types'
import type { TaskStatus, TaskProgressState } from '@/store/tasksSlice'
import { taskAdded, taskRemoved, selectTaskById } from '@/store/tasksSlice'
import { useAppDispatch, useAppSelector } from '@/store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { TaskStatus, TaskProgressState }

export interface UseTaskSubmitReturn<TInput = unknown, TResult = unknown> {
  /** Task ID assigned by the main process. Null before submit() is called. */
  taskId: string | null
  /** Current lifecycle status. Null before submit() is called. */
  status: TaskStatus | null
  /** Progress state — percent 0–100 and optional message. */
  progress: TaskProgressState
  /** Optional human-readable progress message from the main process. */
  progressMessage: string | undefined
  /** Error message when status === 'error'. */
  error: string | undefined
  /** Result payload from the completed event, typed by TResult. */
  result: TResult | undefined
  /** Current queue position when status is 'queued'. */
  queuePosition: number | undefined
  /** Wall-clock duration of the task in milliseconds, set on completion. */
  durationMs: number | undefined
  /** Submit the task. */
  submit: (input: TInput, options?: TaskOptions) => Promise<void>
  /** Cancel the current task. No-op if not running. */
  cancel: () => void
  /** Change the priority of the queued task. */
  updatePriority: (priority: TaskPriority) => void
  /** Reset hook back to idle state. No-op while a task is active. */
  reset: () => void
  /** True when no task has been submitted yet. */
  isIdle: boolean
  /** True when status === 'queued'. */
  isQueued: boolean
  /** True when status === 'running'. */
  isRunning: boolean
  /** True when status === 'completed'. */
  isCompleted: boolean
  /** True when status === 'error'. */
  isError: boolean
  /** True when status === 'cancelled'. */
  isCancelled: boolean
}

export interface TaskOptions {
  priority?: TaskPriority
  timeoutMs?: number
}

// Terminal statuses — the task cannot change state again (except via a new submit).
const TERMINAL_STATUSES: ReadonlySet<TaskStatus> = new Set([
  'completed',
  'error',
  'cancelled',
])

const EMPTY_PROGRESS: TaskProgressState = { percent: 0 }

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTaskSubmit — manages the full lifecycle of a single task submission.
 *
 * Reads task state from Redux via selectTaskById instead of the former
 * module-level taskStore singleton. Dispatches taskAdded on submit and
 * taskRemoved on reset.
 *
 * Key behaviours:
 *  - Dispatches taskAdded before IPC events arrive so taskEventReceived
 *    reducers always find the task and no events are dropped
 *  - All status fields derived from Redux (useAppSelector) — no duplicated
 *    local state for store-owned fields
 *  - On unmount cancels the task if still in a non-terminal status
 *  - cancel() / updatePriority() are best-effort IPC calls; the main process
 *    emits authoritative state-change events that Redux picks up
 *  - Gracefully no-ops when window.tasksManager is unavailable (tests)
 *
 * @template TInput Type of the task input payload.
 * @template TResult Type of the result from the completed event.
 */
export function useTaskSubmit<TInput = unknown, TResult = unknown>(
  type: string,
  input: TInput,
  options?: TaskSubmitOptions
): UseTaskSubmitReturn<TInput, TResult> {
  const dispatch = useAppDispatch()

  // The only local state is which task ID this hook instance "owns".
  // Everything else is derived from Redux via useAppSelector.
  const [taskId, setTaskId] = useState<string | null>(null)

  // Stable ref so callbacks always see the latest taskId without needing it
  // in their dependency arrays.
  const taskIdRef = useRef<string | null>(null)

  // Guard: prevents re-submitting while a task is still active.
  const runningRef = useRef<boolean>(false)

  // Read this task's slice of Redux state. Returns undefined when taskId is
  // null (before first submit) or after the task has been removed.
  const taskState = useAppSelector((state) =>
    taskId !== null ? selectTaskById(state, taskId) : undefined
  )

  // Derive all display fields from the Redux task state.
  const status: TaskStatus | null = taskState?.status ?? null
  const progress: TaskProgressState = taskState?.progress ?? EMPTY_PROGRESS
  const progressMessage: string | undefined = taskState?.progress.message
  const error: string | undefined = taskState?.error
  const result: TResult | undefined = taskState?.result as TResult | undefined
  const queuePosition: number | undefined = taskState?.queuePosition
  const durationMs: number | undefined = taskState?.durationMs

  // Release the running guard once a terminal status is observed via Redux.
  useEffect(() => {
    if (status !== null && TERMINAL_STATUSES.has(status)) {
      runningRef.current = false
    }
  }, [status])

  // Best-effort cancel on unmount if the task is still active.
  useEffect(() => {
    return () => {
      const id = taskIdRef.current
      if (id && runningRef.current) {
        window.tasksManager?.cancel(id).catch(() => {
          // Best-effort — no recovery needed.
        })
      }
    }
  }, [])

  const submit = useCallback(
    async (inputOverride?: TInput, submitOptions?: TaskOptions): Promise<void> => {
      if (runningRef.current) return

      if (typeof window.tasksManager?.submit !== 'function') {
        console.warn(
          '[useTaskSubmit] window.tasksManager.submit is not available. ' +
            'The main-process task IPC handlers have not been registered yet.'
        )
        return
      }

      runningRef.current = true

      const mergedOptions: TaskSubmitOptions = {
        ...options,
        ...submitOptions,
      }

      let resolvedTaskId: string

      try {
        const ipcResult = await window.tasksManager.submit(
          type,
          inputOverride ?? input,
          mergedOptions
        )

        if (!ipcResult.success) {
          runningRef.current = false
          console.error('[useTaskSubmit] IPC submit rejected:', ipcResult.error.message)
          return
        }

        resolvedTaskId = ipcResult.data.taskId
      } catch (err) {
        runningRef.current = false
        console.error('[useTaskSubmit] submit threw:', err)
        return
      }

      // Register the task in Redux before any IPC events arrive. This ensures
      // taskEventReceived reducers will find the task and apply state updates.
      dispatch(
        taskAdded({
          taskId: resolvedTaskId,
          type,
          priority: mergedOptions.priority ?? options?.priority ?? 'normal',
        })
      )

      taskIdRef.current = resolvedTaskId
      setTaskId(resolvedTaskId)
    },
    [dispatch, type, input, options]
  )

  const cancel = useCallback((): void => {
    const id = taskIdRef.current
    if (!id) return
    if (typeof window.tasksManager?.cancel !== 'function') return

    window.tasksManager.cancel(id).catch(() => {
      // Best-effort — the cancelled event from the main process will update Redux.
    })
  }, [])

  const updatePriority = useCallback((priority: TaskPriority): void => {
    const id = taskIdRef.current
    if (!id) return
    if (typeof window.tasksManager?.updatePriority !== 'function') return

    window.tasksManager.updatePriority(id, priority).catch(() => {
      // Best-effort — the priority-changed event from the main process will update Redux.
    })
  }, [])

  const reset = useCallback((): void => {
    // Prevent resetting while a task is still active.
    if (runningRef.current) return

    const id = taskIdRef.current
    if (id) {
      dispatch(taskRemoved(id))
    }

    taskIdRef.current = null
    setTaskId(null)
  }, [dispatch])

  return {
    taskId,
    status,
    progress,
    progressMessage,
    error,
    result,
    queuePosition,
    durationMs,
    submit,
    cancel,
    updatePriority,
    reset,
    isIdle: taskId === null,
    isQueued: status === 'queued',
    isRunning: status === 'running',
    isCompleted: status === 'completed',
    isError: status === 'error',
    isCancelled: status === 'cancelled',
  }
}
