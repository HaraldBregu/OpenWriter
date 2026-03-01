import { useState, useEffect, useCallback } from 'react'
import { taskStore, TrackedTaskState, TaskStatus } from '../services/taskStore'

function buildSnapshot(): TrackedTaskState[] {
  const arr: TrackedTaskState[] = []
  for (const id of taskStore.getTrackedIds()) {
    const snap = taskStore.getTaskSnapshot(id)
    if (snap) arr.push(snap)
  }
  return arr
}

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
  const [allTasks, setAllTasks] = useState<TrackedTaskState[]>(buildSnapshot)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    taskStore.ensureListening()
    return taskStore.subscribe('ALL', () => {
      setAllTasks(buildSnapshot())
    })
  }, [])

  const tasks = allTasks.filter((t) => !hiddenIds.has(t.taskId))

  const queueStats: DebugQueueStats = {
    queued: allTasks.filter((t) => t.status === 'queued').length,
    running: allTasks.filter((t) => t.status === 'running').length,
    paused: allTasks.filter((t) => t.status === 'paused').length,
    completed: allTasks.filter((t) => t.status === 'completed').length,
    error: allTasks.filter((t) => (t.status as TaskStatus) === 'error').length,
    cancelled: allTasks.filter((t) => t.status === 'cancelled').length,
  }

  const hide = useCallback((taskId: string) => {
    setHiddenIds((prev) => new Set([...prev, taskId]))
  }, [])

  const cancel = useCallback(async (taskId: string) => {
    await window.tasksManager.cancel(taskId)
  }, [])

  const pause = useCallback(async (taskId: string) => {
    await window.tasksManager.pause(taskId)
  }, [])

  const resume = useCallback(async (taskId: string) => {
    await window.tasksManager.resume(taskId)
  }, [])

  return { tasks, queueStats, hide, cancel, pause, resume }
}
