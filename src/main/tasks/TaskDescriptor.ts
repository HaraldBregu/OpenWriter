/**
 * Task status enumeration.
 */
export type TaskStatus = 'queued' | 'running' | 'completed' | 'error' | 'cancelled'

/**
 * Task priority levels for queue ordering.
 */
export type TaskPriority = 'low' | 'normal' | 'high'

/**
 * Options for task submission.
 */
export interface TaskOptions {
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
 * Active task descriptor maintained by TaskExecutorService.
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
}
