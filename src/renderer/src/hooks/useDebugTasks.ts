import { useState, useCallback } from 'react'
import { useAppSelector } from '@/store'
import { selectAllTasks, selectQueueStats, taskRemoved } from '@/store/tasksSlice'
import type { TrackedTaskState, TaskStatus } from '@/store/tasksSlice'
import { useAppDispatch } from '@/store'

export type { TrackedTaskState, TaskStatus }

export interface DebugQueueStats {
  queued: number
  running: number
  completed: number
  error: number
  cancelled: number
}

export interface UseDebugTasksReturn {
  tasks: TrackedTaskState[]
  queueStats: DebugQueueStats
  hide: (taskId: string) => void
  cancel: (taskId: string) => Promise<void>
}

export function useDebugTasks(): UseDebugTasksReturn {
  const dispatch = useAppDispatch()
  const allTasks = useAppSelector(selectAllTasks)
  const rawStats = useAppSelector(selectQueueStats)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  const tasks = allTasks.filter((t) => !hiddenIds.has(t.taskId))

  const queueStats: DebugQueueStats = {
    queued: rawStats.queued,
    running: rawStats.running,
    completed: rawStats.completed,
    error: rawStats.error,
    cancelled: rawStats.cancelled,
  }

  // "Hide" removes the task from the local view and also removes it from the
  // Redux store so it doesn't reappear on re-render.
  const hide = useCallback(
    (taskId: string) => {
      setHiddenIds((prev) => new Set([...prev, taskId]))
      dispatch(taskRemoved(taskId))
    },
    [dispatch]
  )

  const cancel = useCallback(async (taskId: string) => {
    await window.tasksManager.cancel(taskId)
  }, [])

  return { tasks, queueStats, hide, cancel }
}
