import { useState, useEffect, useCallback, useRef } from 'react'
import type { TaskInfo } from '../../../shared/types/ipc/types'
import { useTaskContext } from '@/contexts/TaskContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskFilter = (task: TaskInfo) => boolean

export interface UseTaskListReturn {
  /** All tasks visible to this hook, optionally filtered. */
  tasks: TaskInfo[]
  /** True while the initial window.task.list() call is in-flight. */
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
 * window.task.list() so the initial render is not empty. Subsequent updates
 * are driven by TaskProvider's shared store — no extra IPC round-trips.
 *
 * @param filter Optional predicate to narrow the returned tasks list.
 *
 * Usage:
 *   const { tasks, isLoading, error } = useTaskList()
 *   const { tasks: running } = useTaskList(t => t.status === 'running')
 */
export function useTaskList(filter?: TaskFilter): UseTaskListReturn {
  const { store } = useTaskContext()

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  // Local snapshot of all tasks — seeded from list() and then kept fresh by
  // the store subscription. Stored in state so React re-renders on change.
  const [allTasks, setAllTasks] = useState<TaskInfo[]>([])

  // Stable ref to the filter so the subscription callback doesn't go stale
  // when the caller passes an inline lambda.
  const filterRef = useRef<TaskFilter | undefined>(filter)
  filterRef.current = filter

  // Subscribe to the ALL key — notified on any task mutation.
  useEffect(() => {
    const unsub = store.subscribe('ALL', () => {
      setAllTasks(store.getAllTasksSnapshot())
    })
    return unsub
  }, [store])

  // Fetch the initial task list from the main process on mount.
  useEffect(() => {
    if (typeof window.task?.list !== 'function') {
      setIsLoading(false)
      setError('Task API not available. Check main process registration.')
      return
    }

    let cancelled = false

    window.task
      .list()
      .then((result) => {
        if (cancelled) return
        if (result.success) {
          // Seed the store with known task IDs so events are accepted.
          for (const info of result.data) {
            store.addTask(info.taskId, info.type)
          }
          setAllTasks(store.getAllTasksSnapshot())
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
  }, [store])

  // Apply optional filter without re-subscribing on every render.
  const tasks = useCallback((): TaskInfo[] => {
    const f = filterRef.current
    return f ? allTasks.filter(f) : allTasks
  }, [allTasks])()

  return { tasks, isLoading, error }
}
