import type { TaskPriority } from '../../shared/types/ipc/types'
export type { TaskPriority }

/**
 * Task status enumeration.
 * 'paused' tasks remain in the queue but are skipped by drainQueue until resumed.
 */
export type TaskStatus = 'queued' | 'paused' | 'running' | 'completed' | 'error' | 'cancelled'

/**
 * Options for task submission.
 */
export interface TaskOptions {
  /**
   * Custom task ID. If provided, the executor will use this instead of generating a UUID.
   */
  taskId?: string

  /**
   * Task priority (default: 'normal')
   */
  priority?: TaskPriority

  /**
   * Timeout in milliseconds (optional)
   * If specified, task will be cancelled after timeout
   */
  timeoutMs?: number

  /**
   * Window ID for window-specific event routing (optional)
   * If not provided, events will be broadcast to all windows
   */
  windowId?: number
}

/**
 * Active task descriptor maintained by TaskExecutor.
 */
export interface ActiveTask {
  /**
   * Unique task identifier (UUID)
   */
  taskId: string

  /**
   * Task type (handler identifier)
   */
  type: string

  /**
   * Current task status
   */
  status: TaskStatus

  /**
   * Task priority
   */
  priority: TaskPriority

  /**
   * Task start timestamp
   */
  startedAt?: number

  /**
   * Task completion timestamp
   */
  completedAt?: number

  /**
   * Abort controller for cancellation
   */
  controller: AbortController

  /**
   * Timeout handle (if timeout specified)
   */
  timeoutHandle?: NodeJS.Timeout

  /**
   * Window ID for event routing
   */
  windowId?: number

  /**
   * Task result (set on completion)
   */
  result?: unknown

  /**
   * Error message (set on error)
   */
  error?: string

  /**
   * Timestamp when the task was paused (while still queued).
   */
  pausedAt?: number
}
