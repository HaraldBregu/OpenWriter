import { useState, useEffect, useCallback, useRef } from 'react'
import type { TaskInfo } from '../../../shared/types/ipc/types'
import { taskStore } from '@/services/taskStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskFilter = (task: TaskInfo) => boolean

export interface UseTaskListReturn {
  /** All tasks visible to this hook, optionally filtered. */
  tasks: TaskInfo[]
  /** True while the initial window.tasksManager.list() call is in-flight. */
  isLoading: boolean
  /** Error from the initial list call, null otherwise. */
  error: string | null
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTaskList — subscribes to all active tasks with optional client-side
 * filtering. Automatically updates whenever a TaskEvent mutates any task.
 *
 * On mount it fetches the current task list from the main process via
 * window.tasksManager.list() so the initial render is not empty. Subsequent
 * updates are driven by the shared taskStore — no extra IPC round-trips.
 *
 * @param filter Optional predicate to narrow the returned tasks list.
 */
export function useTaskList(filter?: TaskFilter): UseTaskListReturn {
  taskStore.ensureListening()

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [allTasks, setAllTasks] = useState<TaskInfo[]>([])

  // Stable ref to the filter so the subscription callback doesn't go stale
  // when the caller passes an inline lambda.
  const filterRef = useRef<TaskFilter | undefined>(filter)
  filterRef.current = filter

  // Subscribe to the ALL key — notified on any task mutation.
  useEffect(() => {
    const unsub = taskStore.subscribe('ALL', () => {
      setAllTasks(taskStore.getAllTasksSnapshot())
    })
    return unsub
  }, [])

  // Fetch the initial task list from the main process on mount.
  useEffect(() => {
    if (typeof window.tasksManager?.list !== 'function') {
      setIsLoading(false)
      setError('Task API not available. Check main process registration.')
      return
    }

    let cancelled = false

    window.tasksManager
      .list()
      .then((result) => {
        if (cancelled) return
        if (result.success) {
          // Seed the store with known task IDs so events are accepted.
          for (const info of result.data) {
            taskStore.addTask(info.taskId, info.type)
          }
          setAllTasks(taskStore.getAllTasksSnapshot())
        } else {
          setError(result.error.message)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to fetch task list')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Apply optional filter without re-subscribing on every render.
  const tasks = useCallback((): TaskInfo[] => {
    const f = filterRef.current
    return f ? allTasks.filter(f) : allTasks
  }, [allTasks])()

  return { tasks, isLoading, error }
}
