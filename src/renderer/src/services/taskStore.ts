/**
 * taskStore — module-level singleton that replaces the TaskProvider/TaskStore
 * React context pattern.
 *
 * Provides the same external store interface previously provided by TaskContext,
 * but as a plain module singleton instead of a React context value.
 * All task-related hooks (useTaskSubmit, useTaskProgress, etc.) import from
 * here directly instead of calling useTaskContext().
 *
 * The single global window.tasksManager.onEvent listener is initialized lazily
 * on first use.
 */

import type { TaskEvent, TaskInfo, TaskPriority } from '../../../shared/types/ipc/types'
import { TASK_MAX_EVENT_HISTORY } from '@/constants'

// ---------------------------------------------------------------------------
// Types (previously exported from TaskContext)
// ---------------------------------------------------------------------------

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
  content: string
  events: TaskEventRecord[]
}

// ---------------------------------------------------------------------------
// Store implementation (identical to createTaskStore() in the former TaskContext)
// ---------------------------------------------------------------------------

const MAX_EVENT_HISTORY = TASK_MAX_EVENT_HISTORY

const taskMap = new Map<string, TrackedTaskState>()
const snapshotCache = new Map<string, TrackedTaskState>()
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

function patch(taskId: string, update: Partial<TrackedTaskState>): void {
  const prev = taskMap.get(taskId)
  if (!prev) return
  const next: TrackedTaskState = { ...prev, ...update }
  taskMap.set(taskId, next)
  snapshotCache.set(taskId, next)
  rebuildAllSnapshot()
  notifyKey(taskId)
  notifyKey('ALL')
}

export function addTask(taskId: string, type: string, priority: TaskPriority = 'normal'): void {
  if (taskMap.has(taskId)) return
  const initial: TrackedTaskState = {
    taskId,
    type,
    status: 'queued',
    priority,
    progress: { percent: 0 },
    streamedContent: '',
    content: '',
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
      patch(taskId, { status: 'queued', queuePosition: qd.position, events })
      break
    }
    case 'started':
      patch(taskId, { status: 'running', queuePosition: undefined, events })
      break
    case 'progress': {
      const pd = event.data
      patch(taskId, {
        status: 'running',
        progress: { percent: pd.percent, message: pd.message, detail: pd.detail },
        events,
      })
      break
    }
    case 'completed': {
      const cd = event.data
      patch(taskId, {
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
      patch(taskId, { status: 'error', error: ed.message, queuePosition: undefined, events })
      break
    }
    case 'cancelled':
      patch(taskId, { status: 'cancelled', queuePosition: undefined, events })
      break
    case 'stream': {
      const sd = event.data
      const prev = taskMap.get(taskId)
      const token = sd.token ?? ''
      patch(taskId, {
        status: 'running',
        streamedContent: token,
        content: (prev?.content ?? '') + token,
        events,
      })
      break
    }
    case 'paused':
      patch(taskId, { status: 'paused', events })
      break
    case 'resumed': {
      const rd = event.data
      patch(taskId, { status: 'queued', queuePosition: rd.position, events })
      break
    }
    case 'priority-changed': {
      const pcd = event.data
      patch(taskId, { priority: pcd.priority, queuePosition: pcd.position, events })
      break
    }
    case 'queue-position': {
      const qpd = event.data
      patch(taskId, { queuePosition: qpd.position, events })
      break
    }
  }
}

export function getTaskSnapshot(taskId: string): TrackedTaskState | undefined {
  return snapshotCache.get(taskId)
}

export function getAllTasksSnapshot(): TaskInfo[] {
  return allTasksSnapshot
}

export function subscribe(key: string, listener: () => void): () => void {
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

export function getTrackedIds(): Set<string> {
  return new Set(taskMap.keys())
}

// ---------------------------------------------------------------------------
// Lazy-init: wire up the global IPC listener once.
// ---------------------------------------------------------------------------

let globalListenerInitialized = false

export function ensureTaskStoreListening(): void {
  if (globalListenerInitialized) return
  if (typeof window.tasksManager?.onEvent !== 'function') return

  globalListenerInitialized = true
  window.tasksManager.onEvent((event: TaskEvent) => {
    applyEvent(event)
  })
}

// ---------------------------------------------------------------------------
// Convenience object (mirrors the former TaskStore interface)
// ---------------------------------------------------------------------------

export const taskStore = {
  getTaskSnapshot,
  getAllTasksSnapshot,
  subscribe,
  applyEvent,
  addTask,
  getTrackedIds,
  ensureListening: ensureTaskStoreListening,
}
