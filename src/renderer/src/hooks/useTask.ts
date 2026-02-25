import { useState, useCallback, useRef, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskStatus = 'queued' | 'running' | 'completed' | 'error' | 'cancelled'

export interface TaskState {
  status: TaskStatus
  progress?: number
  message?: string
  result?: unknown
  error?: string
  streamedContent?: string
}

export interface TaskOptions {
  priority?: 'low' | 'normal' | 'high'
  timeoutMs?: number
}

export interface UseTaskReturn {
  /** Submit a task for background execution. Returns the taskId on success. */
  submitTask: (type: string, input: unknown, options?: TaskOptions) => Promise<string | null>
  /** Cancel a running task by ID. Returns true if the task was found and cancelled. */
  cancelTask: (taskId: string) => Promise<boolean>
  /** Map of taskId -> TaskState for all tracked tasks. */
  tasks: Map<string, TaskState>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTask -- local-state hook for submitting and tracking background tasks
 * executed by the Electron main process via window.task.
 *
 * Responsibilities:
 *  - Submits tasks via IPC and tracks their lifecycle in a Map<string, TaskState>
 *  - Listens to task:event for progress, completion, error, and cancellation updates
 *  - Filters events by taskId so only tasks submitted by this hook instance are tracked
 *  - Buffers events arriving before the taskId is resolved (mirrors usePipeline pattern)
 *  - Cleans up the IPC event listener on component unmount
 *  - Gracefully no-ops when the task API is not yet available
 *
 * Usage:
 *   const { submitTask, cancelTask, tasks } = useTask()
 *   const taskId = await submitTask('file-download', { url: '...' })
 *   const state = tasks.get(taskId)
 */
export function useTask(): UseTaskReturn {
  const [tasks, setTasks] = useState<Map<string, TaskState>>(new Map())

  // Set of taskIds owned by this hook instance -- used for event filtering.
  const ownedTaskIdsRef = useRef<Set<string>>(new Set())

  // Holds the IPC unsubscribe function for cleanup.
  const unsubRef = useRef<(() => void) | null>(null)

  // Buffer for events that arrive before their taskId is resolved from submit.
  const bufferedEventsRef = useRef<Array<{ type: string; data: Record<string, unknown> }>>([])

  // Pending taskIds that haven't resolved yet -- events for these get buffered.
  const pendingTaskIdsRef = useRef<Set<string>>(new Set())

  // Cleanup timeouts for terminal-state tasks (auto-removed after TTL).
  const cleanupTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Schedule auto-removal of a terminal-state task after TTL.
  const scheduleCleanup = useCallback((taskId: string) => {
    // Clear any existing timer for this task
    const existing = cleanupTimersRef.current.get(taskId)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      cleanupTimersRef.current.delete(taskId)
      ownedTaskIdsRef.current.delete(taskId)
      setTasks((prev) => {
        const next = new Map(prev)
        next.delete(taskId)
        return next
      })
    }, 60_000) // 60 seconds

    cleanupTimersRef.current.set(taskId, timer)
  }, [])

  // Clear all cleanup timers on unmount.
  useEffect(() => {
    return () => {
      cleanupTimersRef.current.forEach((timer) => clearTimeout(timer))
      cleanupTimersRef.current.clear()
    }
  }, [])

  // Helper: update a single task entry in the Map.
  const updateTask = useCallback((taskId: string, patch: Partial<TaskState>) => {
    setTasks((prev) => {
      const next = new Map(prev)
      const current = next.get(taskId) ?? { status: 'queued' as TaskStatus }
      next.set(taskId, { ...current, ...patch })
      return next
    })
  }, [])

  // Process a single task event.
  const processEvent = useCallback(
    (event: { type: string; data: Record<string, unknown> }) => {
      const taskId = event.data.taskId as string
      if (!taskId) return

      // Only process events for tasks owned by this hook instance.
      if (!ownedTaskIdsRef.current.has(taskId)) return

      switch (event.type) {
        case 'queued':
          updateTask(taskId, { status: 'queued' })
          break
        case 'started':
          updateTask(taskId, { status: 'running' })
          break
        case 'progress':
          updateTask(taskId, {
            status: 'running',
            progress: event.data.percent as number,
            message: event.data.message as string | undefined
          })
          break
        case 'completed':
          updateTask(taskId, {
            status: 'completed',
            result: event.data.result,
            progress: 100
          })
          scheduleCleanup(taskId)
          break
        case 'error':
          updateTask(taskId, {
            status: 'error',
            error: event.data.message as string
          })
          scheduleCleanup(taskId)
          break
        case 'cancelled':
          updateTask(taskId, { status: 'cancelled' })
          scheduleCleanup(taskId)
          break
        case 'stream': {
          const token = (event.data as Record<string, unknown>).token as string ?? ''
          setTasks((prev) => {
            const next = new Map(prev)
            const current = next.get(taskId) ?? { status: 'running' as TaskStatus }
            next.set(taskId, {
              ...current,
              status: 'running',
              streamedContent: (current.streamedContent ?? '') + token
            })
            return next
          })
          break
        }
      }
    },
    [updateTask, scheduleCleanup]
  )

  // Subscribe to task events on mount, unsubscribe on unmount.
  useEffect(() => {
    if (typeof window.task?.onEvent !== 'function') return

    const unsub = window.task.onEvent(
      (event: { type: string; data: unknown }) => {
        const typedEvent = { type: event.type, data: event.data as Record<string, unknown> }
        const taskId = typedEvent.data.taskId as string

        // If this taskId is still pending resolution from submit(), buffer it.
        if (taskId && pendingTaskIdsRef.current.has(taskId)) {
          bufferedEventsRef.current.push(typedEvent)
          return
        }

        processEvent(typedEvent)
      }
    )

    unsubRef.current = unsub

    return () => {
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
    }
  }, [processEvent])

  const submitTask = useCallback(
    async (type: string, input: unknown, options?: TaskOptions): Promise<string | null> => {
      // Graceful fallback: task API not yet available.
      if (typeof window.task?.submit !== 'function') {
        console.warn(
          '[useTask] window.task.submit is not available. ' +
            'The main-process task IPC handlers have not been registered yet.'
        )
        return null
      }

      let taskId: string

      try {
        const result = await window.task.submit(type, input, options)

        // taskSubmit returns an IpcResult envelope
        if (!result.success) {
          // Create a transient error entry so the caller can see it.
          const errorId = `error-${Date.now()}`
          updateTask(errorId, { status: 'error', error: result.error.message })
          return null
        }

        taskId = result.data.taskId
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit task'
        const errorId = `error-${Date.now()}`
        updateTask(errorId, { status: 'error', error: message })
        return null
      }

      // Register ownership and set initial state.
      ownedTaskIdsRef.current.add(taskId)
      pendingTaskIdsRef.current.delete(taskId)
      updateTask(taskId, { status: 'queued' })

      // Replay any buffered events for this taskId.
      const buffered = bufferedEventsRef.current.filter(
        (e) => (e.data.taskId as string) === taskId
      )
      bufferedEventsRef.current = bufferedEventsRef.current.filter(
        (e) => (e.data.taskId as string) !== taskId
      )
      for (const event of buffered) {
        processEvent(event)
      }

      return taskId
    },
    [updateTask, processEvent]
  )

  const cancelTask = useCallback(async (taskId: string): Promise<boolean> => {
    if (typeof window.task?.cancel !== 'function') return false

    try {
      const result = await window.task.cancel(taskId)
      if (result.success) return result.data
    } catch {
      // Best-effort cancellation -- the task:event listener will pick up
      // the cancelled status if the main process processes it.
    }
    return false
  }, [])

  return { submitTask, cancelTask, tasks }
}
