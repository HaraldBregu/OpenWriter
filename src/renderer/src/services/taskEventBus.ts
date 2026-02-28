/**
 * taskEventBus — module-level singleton for subscribing to task events.
 *
 * Provides a single window.tasksManager.onEvent subscription (lazy-init on
 * first use) shared across all callers. Individual callers subscribe via
 * subscribeToTask(taskId, cb), and only callbacks for the matching taskId
 * are invoked when an event arrives.
 *
 * This avoids the need for a React context to distribute task events.
 */

import type { TaskEvent } from '../../../shared/types/ipc/types'

// ---------------------------------------------------------------------------
// Snapshot shape delivered to per-task subscribers
// ---------------------------------------------------------------------------

export interface TaskSnapshot {
  status: string
  streamedContent: string
  content: string
  error?: string
  result?: unknown
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Per-task subscriber sets: taskId → Set<callback> */
const subscribers = new Map<string, Set<(snap: TaskSnapshot) => void>>()

/** Accumulated snapshots per task so late subscribers can replay. */
const snapshots = new Map<string, TaskSnapshot>()

/** The single unsub handle from window.tasksManager.onEvent. */
let globalUnsub: (() => void) | null = null

// ---------------------------------------------------------------------------
// Lazy-init: subscribe to the global IPC event stream once on first use.
// ---------------------------------------------------------------------------

function ensureListening(): void {
  if (globalUnsub !== null) return
  if (typeof window.tasksManager?.onEvent !== 'function') return

  globalUnsub = window.tasksManager.onEvent((event: TaskEvent) => {
    const data = event.data as { taskId?: string }
    const taskId = data?.taskId
    if (!taskId) return

    // Build or update snapshot for this task.
    const prev = snapshots.get(taskId) ?? { status: 'queued', streamedContent: '', content: '' }
    let next: TaskSnapshot

    switch (event.type) {
      case 'queued':
        next = { ...prev, status: 'queued' }
        break
      case 'started':
        next = { ...prev, status: 'running' }
        break
      case 'progress':
        next = { ...prev, status: 'running' }
        break
      case 'stream': {
        const sd = event.data as { token?: string }
        const token = sd.token ?? ''
        next = {
          ...prev,
          status: 'running',
          streamedContent: token,
          content: (prev.content ?? '') + token,
        }
        break
      }
      case 'completed': {
        const cd = event.data as { result?: unknown }
        next = { ...prev, status: 'completed', result: cd.result }
        snapshots.set(taskId, next)
        subscribers.get(taskId)?.forEach((cb) => cb(next))
        // Clear snapshot after all subscribers have processed the terminal event.
        setTimeout(() => snapshots.delete(taskId), 0)
        return
      }
      case 'error': {
        const ed = event.data as { message?: string }
        next = { ...prev, status: 'error', error: ed.message }
        snapshots.set(taskId, next)
        subscribers.get(taskId)?.forEach((cb) => cb(next))
        setTimeout(() => snapshots.delete(taskId), 0)
        return
      }
      case 'cancelled':
        next = { ...prev, status: 'cancelled' }
        snapshots.set(taskId, next)
        subscribers.get(taskId)?.forEach((cb) => cb(next))
        setTimeout(() => snapshots.delete(taskId), 0)
        return
      case 'paused':
        next = { ...prev, status: 'paused' }
        break
      case 'resumed':
        next = { ...prev, status: 'queued' }
        break
      default:
        next = prev
    }

    snapshots.set(taskId, next)

    // Notify subscribers for this specific task.
    subscribers.get(taskId)?.forEach((cb) => cb(next))
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * subscribeToTask — register a callback for events on a single task.
 *
 * The callback fires synchronously whenever a task event for `taskId` arrives.
 * Returns an unsubscribe function; call it to stop receiving events.
 *
 * @param taskId  The task ID to subscribe to.
 * @param cb      Called with the latest TaskSnapshot on every event.
 * @returns       Unsubscribe function.
 */
export function subscribeToTask(
  taskId: string,
  cb: (snap: TaskSnapshot) => void,
): () => void {
  ensureListening()

  let set = subscribers.get(taskId)
  if (!set) {
    set = new Set()
    subscribers.set(taskId, set)
  }
  set.add(cb)

  return () => {
    const s = subscribers.get(taskId)
    if (!s) return
    s.delete(cb)
    if (s.size === 0) {
      subscribers.delete(taskId)
      snapshots.delete(taskId)
    }
  }
}

/**
 * Returns the latest snapshot for a task, or undefined if unknown.
 * Useful for reading current state on mount without waiting for the next event.
 */
export function getTaskSnapshot(taskId: string): TaskSnapshot | undefined {
  return snapshots.get(taskId)
}

/**
 * Seed the cumulative `content` field for a task before streaming begins.
 * Call this with the original text so that streamed tokens are appended to it.
 */
export function initTaskContent(taskId: string, initialContent: string): void {
  const prev = snapshots.get(taskId) ?? { status: 'queued', streamedContent: '', content: '' }
  const next: TaskSnapshot = { ...prev, content: initialContent }
  snapshots.set(taskId, next)
}

export const taskEventBus = { subscribeToTask, getTaskSnapshot, initTaskContent }
