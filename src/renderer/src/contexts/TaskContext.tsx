import React, { createContext, useContext, useEffect, useRef } from 'react'
import type { TaskEvent, TaskInfo, TaskPriority } from '../../../shared/types/ipc/types'
import { TASK_MAX_EVENT_HISTORY } from '@/constants'

// ---------------------------------------------------------------------------
// Re-exported shared types
// ---------------------------------------------------------------------------

export type { TaskEvent, TaskInfo, TaskPriority }

// ---------------------------------------------------------------------------
// Local state types
// ---------------------------------------------------------------------------

// Mirrors the shared TaskStatus union, including the new 'paused' state.
export type TaskStatus = 'queued' | 'paused' | 'running' | 'completed' | 'error' | 'cancelled'

export interface TaskProgressState {
  percent: number
  message?: string
  detail?: unknown
}

export interface TaskEventRecord {
  type: TaskEvent['type']
  data: TaskEvent['data']
  receivedAt: number
}

export interface TrackedTaskState {
  taskId: string
  type: string
  status: TaskStatus
  priority: TaskPriority
  progress: TaskProgressState
  queuePosition?: number
  durationMs?: number
  error?: string
  result?: unknown
  streamedContent: string
  events: TaskEventRecord[]
}

// ---------------------------------------------------------------------------
// External store — lives outside React, zero-cost subscriptions.
//
// The store uses a Map<taskId, TrackedTaskState> as source of truth and a
// Map<subscriptionKey, Set<listener>> for per-granularity subscriptions.
//
// Subscription keys:
//   'ALL'    → notified on every task mutation (useTaskList, useTaskQueue)
//   taskId   → notified only when that specific task changes (useTaskProgress,
//              useTaskSubmit, useTaskStatus, useTaskStream)
//
// This guarantees that a stream token for task-A does not cause task-B
// observers to re-render.
// ---------------------------------------------------------------------------

const MAX_EVENT_HISTORY = 50

export interface TaskStore {
  getTaskSnapshot: (taskId: string) => TrackedTaskState | undefined
  getAllTasksSnapshot: () => TaskInfo[]
  subscribe: (key: string, listener: () => void) => () => void
  applyEvent: (event: TaskEvent) => void
  addTask: (taskId: string, type: string, priority?: TaskPriority) => void
  getTrackedIds: () => Set<string>
}

function createTaskStore(): TaskStore {
  const taskMap = new Map<string, TrackedTaskState>()
  // Stable snapshot cache — avoids reference churn in useSyncExternalStore
  const snapshotCache = new Map<string, TrackedTaskState>()
  // Flat snapshot of all tasks as TaskInfo[] — rebuilt on each mutation
  let allTasksSnapshot: TaskInfo[] = []
  const listeners = new Map<string, Set<() => void>>()

  function notifyKey(key: string): void {
    listeners.get(key)?.forEach((fn) => fn())
  }

  function rebuildAllSnapshot(): void {
    allTasksSnapshot = Array.from(taskMap.values()).map((t) => ({
      taskId: t.taskId,
      type: t.type,
      status: t.status,
      priority: t.priority,
      queuePosition: t.queuePosition,
      durationMs: t.durationMs,
      startedAt: undefined,
      completedAt: undefined,
      error: t.error,
    }))
  }

  function update(taskId: string, patch: Partial<TrackedTaskState>): void {
    const prev = taskMap.get(taskId)
    if (!prev) return
    const next: TrackedTaskState = { ...prev, ...patch }
    taskMap.set(taskId, next)
    snapshotCache.set(taskId, next)
    rebuildAllSnapshot()
    notifyKey(taskId)
    notifyKey('ALL')
  }

  function addTask(taskId: string, type: string, priority: TaskPriority = 'normal'): void {
    if (taskMap.has(taskId)) return
    const initial: TrackedTaskState = {
      taskId,
      type,
      status: 'queued',
      priority,
      progress: { percent: 0 },
      streamedContent: '',
      events: [],
    }
    taskMap.set(taskId, initial)
    snapshotCache.set(taskId, initial)
    rebuildAllSnapshot()
    notifyKey(taskId)
    notifyKey('ALL')
  }

  function appendEvent(taskId: string, record: TaskEventRecord): TaskEventRecord[] {
    const prev = taskMap.get(taskId)
    if (!prev) return []
    return prev.events.length >= MAX_EVENT_HISTORY
      ? [...prev.events.slice(1), record]
      : [...prev.events, record]
  }

  function applyEvent(event: TaskEvent): void {
    const data = event.data as { taskId: string }
    const taskId = data?.taskId
    if (!taskId) return

    // Auto-create an entry for queued events so the store stays consistent
    // even when the provider receives an event before addTask() is called.
    if (!taskMap.has(taskId)) {
      if (event.type === 'queued') {
        addTask(taskId, '')
      } else {
        return
      }
    }

    const record: TaskEventRecord = {
      type: event.type,
      data: event.data,
      receivedAt: Date.now(),
    }
    const events = appendEvent(taskId, record)

    switch (event.type) {
      case 'queued': {
        const qd = event.data
        update(taskId, { status: 'queued', queuePosition: qd.position, events })
        break
      }
      case 'started':
        update(taskId, { status: 'running', queuePosition: undefined, events })
        break
      case 'progress': {
        const pd = event.data
        update(taskId, {
          status: 'running',
          progress: { percent: pd.percent, message: pd.message, detail: pd.detail },
          events,
        })
        break
      }
      case 'completed': {
        const cd = event.data
        update(taskId, {
          status: 'completed',
          progress: { percent: 100 },
          result: cd.result,
          durationMs: cd.durationMs,
          queuePosition: undefined,
          events,
        })
        break
      }
      case 'error': {
        const ed = event.data
        update(taskId, { status: 'error', error: ed.message, queuePosition: undefined, events })
        break
      }
      case 'cancelled':
        update(taskId, { status: 'cancelled', queuePosition: undefined, events })
        break
      case 'stream': {
        const sd = event.data
        const prev = taskMap.get(taskId)
        update(taskId, {
          status: 'running',
          streamedContent: (prev?.streamedContent ?? '') + (sd.token ?? ''),
          events,
        })
        break
      }
      case 'paused':
        update(taskId, { status: 'paused', events })
        break
      case 'resumed': {
        const rd = event.data
        update(taskId, { status: 'queued', queuePosition: rd.position, events })
        break
      }
      case 'priority-changed': {
        const pcd = event.data
        update(taskId, { priority: pcd.priority, queuePosition: pcd.position, events })
        break
      }
      case 'queue-position': {
        const qpd = event.data
        update(taskId, { queuePosition: qpd.position, events })
        break
      }
    }
  }

  function getTaskSnapshot(taskId: string): TrackedTaskState | undefined {
    return snapshotCache.get(taskId)
  }

  function getAllTasksSnapshot(): TaskInfo[] {
    return allTasksSnapshot
  }

  function subscribe(key: string, listener: () => void): () => void {
    let set = listeners.get(key)
    if (!set) {
      set = new Set()
      listeners.set(key, set)
    }
    set.add(listener)
    return () => {
      set!.delete(listener)
      if (set!.size === 0) listeners.delete(key)
    }
  }

  function getTrackedIds(): Set<string> {
    return new Set(taskMap.keys())
  }

  return {
    getTaskSnapshot,
    getAllTasksSnapshot,
    subscribe,
    applyEvent,
    addTask,
    getTrackedIds,
  }
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

interface TaskContextValue {
  store: TaskStore
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined)

// ---------------------------------------------------------------------------
// TaskProvider
// ---------------------------------------------------------------------------

interface TaskProviderProps {
  children: React.ReactNode
}

/**
 * TaskProvider — mounts a single global window.task.onEvent listener and
 * broadcasts all incoming TaskEvents into the shared TaskStore. Components
 * that subscribe via useTaskSubmit / useTaskList / useTaskProgress / etc.
 * read from the same store and re-render only when their specific slice changes.
 *
 * Place this once, high in the component tree (e.g. AppLayout), so all
 * task-aware components share a single IPC subscription.
 */
function TaskProvider({ children }: TaskProviderProps): React.JSX.Element {
  // The store is created once per provider mount and its reference never changes.
  const storeRef = useRef<TaskStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = createTaskStore()
  }
  const store = storeRef.current

  // Single global IPC listener — all task events are funnelled into the store.
  useEffect(() => {
    if (typeof window.task?.onEvent !== 'function') return

    const unsub = window.task.onEvent((event: TaskEvent) => {
      store.applyEvent(event)
    })

    return () => unsub()
  }, [store])

  // Context value is a stable object — the store ref never changes identity.
  const contextValueRef = useRef<TaskContextValue>({ store })

  return (
    <TaskContext.Provider value={contextValueRef.current}>
      {children}
    </TaskContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Internal helper — throws a meaningful error when hooks are used outside provider
// ---------------------------------------------------------------------------

function useTaskContext(): TaskContextValue {
  const ctx = useContext(TaskContext)
  if (ctx === undefined) {
    throw new Error(
      'useTask* hooks must be used within a <TaskProvider>. ' +
        'Wrap your application (or the relevant subtree) with <TaskProvider>.'
    )
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { TaskProvider, TaskContext, useTaskContext }
export type { TaskContextValue }
