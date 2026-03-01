/**
 * TaskExecutor -- orchestrator for background task execution.
 *
 * Responsibilities:
 *  1. Accept task submissions (type + input) and queue them by priority.
 *  2. Look up the handler in TaskHandlerRegistry.
 *  3. Execute tasks concurrently up to a configurable limit.
 *  4. Create an AbortController per task for independent cancellation.
 *  5. Forward TaskEvents to the EventBus for renderer delivery.
 *  6. Drain the queue automatically when execution slots free up.
 *  7. Support priority updates that reorder the queue immediately.
 *  8. Retain completed/errored/cancelled tasks for TTL seconds for result retrieval.
 *
 * Implements Disposable so ServiceContainer calls destroy() on shutdown,
 * aborting any in-flight tasks.
 */

import { randomUUID } from 'crypto'
import type { Disposable } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { TaskHandlerRegistry } from './TaskHandlerRegistry'
import type { TaskEvent } from './TaskEvents'
import type { ProgressReporter, StreamReporter } from './TaskHandler'
import type { ActiveTask, TaskOptions, TaskPriority } from './TaskDescriptor'
import type { TaskQueueStatus } from '../../shared/types'

/** How long (ms) to retain completed/errored/cancelled tasks for result retrieval. */
const COMPLETED_TASK_TTL_MS = 5 * 60 * 1_000 // 5 minutes

/** Priority ordering for queue sorting (higher number = higher priority). */
const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 3,
  normal: 2,
  low: 1
}

/** Queued task waiting for an execution slot. */
interface QueuedTask {
  taskId: string
  type: string
  input: unknown
  priority: TaskPriority
  windowId?: number
  timeoutMs?: number
  controller: AbortController
  queuedAt: number
}

export class TaskExecutor implements Disposable {
  private activeTasks = new Map<string, ActiveTask>()
  /** Completed/errored/cancelled tasks retained for result retrieval until TTL expires. */
  private completedTasks = new Map<string, { task: ActiveTask; expiresAt: number }>()
  private queue: QueuedTask[] = []
  private runningCount = 0
  private gcHandle: NodeJS.Timeout | null = null

  constructor(
    private readonly registry: TaskHandlerRegistry,
    private readonly eventBus: EventBus,
    private readonly maxConcurrency: number = 5
  ) {
    // Run GC every minute to evict expired completed tasks
    this.gcHandle = setInterval(() => this.gcCompletedTasks(), 60_000)
    this.gcHandle.unref()
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Submit a task for execution. Returns the taskId immediately.
   *
   * The task is either started right away (if slots are available)
   * or placed in the priority queue.
   */
  submit<TInput>(type: string, input: TInput, options?: TaskOptions): string {
    const handler = this.registry.get(type)

    // Validate input if handler supports it
    if (handler.validate) {
      handler.validate(input)
    }

    const taskId = options?.taskId ?? randomUUID()
    const priority = options?.priority ?? 'normal'
    const controller = new AbortController()

    const activeTask: ActiveTask = {
      taskId,
      type,
      status: 'queued',
      priority,
      controller,
      windowId: options?.windowId
    }

    this.activeTasks.set(taskId, activeTask)

    // Notify main-process observers (e.g. TaskReactionBus) about the new submission
    this.eventBus.emit('task:submitted', { taskId, taskType: type, input, priority, windowId: options?.windowId })

    const queued: QueuedTask = {
      taskId,
      type,
      input,
      priority,
      windowId: options?.windowId,
      timeoutMs: options?.timeoutMs,
      controller,
      queuedAt: Date.now()
    }

    this.queue.push(queued)
    this.sortQueue()

    const position = this.queue.indexOf(queued) + 1
    this.send(options?.windowId, 'task:event', {
      type: 'queued',
      data: { taskId, position }
    } satisfies TaskEvent)

    console.log(`[TaskExecutor] Task ${taskId} queued (type="${type}", priority=${priority})`)

    this.drainQueue()

    return taskId
  }

  /**
   * Cancel a task by its ID.
   * Works for both queued and running tasks.
   * Returns true if the task was found and cancelled.
   */
  cancel(taskId: string): boolean {
    const task = this.activeTasks.get(taskId)
    if (!task) return false

    console.log(`[TaskExecutor] Cancelling task ${taskId}`)

    // Abort the controller (signals running task or prevents queued task from starting)
    task.controller.abort()

    // Remove from queue if still queued
    const queueIdx = this.queue.findIndex((q) => q.taskId === taskId)
    if (queueIdx !== -1) {
      this.queue.splice(queueIdx, 1)
    }

    // Clean up timeout
    if (task.timeoutHandle) {
      clearTimeout(task.timeoutHandle)
    }

    task.status = 'cancelled'
    task.completedAt = Date.now()

    this.send(task.windowId, 'task:event', {
      type: 'cancelled',
      data: { taskId }
    } satisfies TaskEvent)

    this.eventBus.emit('task:cancelled', { taskId, taskType: task.type, windowId: task.windowId })

    // Retain in completed store for TTL-based result retrieval
    this.completedTasks.set(taskId, {
      task: { ...task, controller: undefined as unknown as AbortController },
      expiresAt: Date.now() + COMPLETED_TASK_TTL_MS
    })

    this.activeTasks.delete(taskId)

    return true
  }

  /**
   * Return a snapshot of all active tasks (queued + running).
   */
  listTasks(): ActiveTask[] {
    return Array.from(this.activeTasks.values()).map(
      ({ taskId, type, status, priority, startedAt, completedAt, windowId }) => ({
        taskId,
        type,
        status,
        priority,
        startedAt,
        completedAt,
        windowId,
        controller: undefined as unknown as AbortController
      })
    )
  }

  /**
   * Cancel all tasks owned by a specific window.
   * Returns the number of tasks that were cancelled.
   */
  cancelByWindow(windowId: number): number {
    let count = 0
    for (const task of this.activeTasks.values()) {
      if (task.windowId === windowId) {
        this.cancel(task.taskId)
        count++
      }
    }
    return count
  }

  /**
   * Update the priority of a queued task.
   * The queue is re-sorted immediately.
   * Returns true if the task was found and its priority updated.
   */
  updatePriority(taskId: string, newPriority: TaskPriority): boolean {
    const task = this.activeTasks.get(taskId)
    if (!task || (task.status !== 'queued' && task.status !== 'paused')) return false

    task.priority = newPriority

    const queued = this.queue.find((q) => q.taskId === taskId)
    if (queued) {
      queued.priority = newPriority
    }

    this.sortQueue()

    const position = queued ? this.queue.indexOf(queued) + 1 : 1

    this.send(task.windowId, 'task:event', {
      type: 'priority-changed',
      data: { taskId, priority: newPriority, position }
    } satisfies TaskEvent)

    console.log(`[TaskExecutor] Task ${taskId} priority updated to "${newPriority}"`)

    // A higher priority task may now be eligible to run sooner
    this.drainQueue()
    return true
  }

  /**
   * Retrieve a completed/errored/cancelled task by its ID.
   * Active (queued/running) tasks are also returned.
   * Returns undefined if the task is unknown or its TTL has expired.
   */
  getTaskResult(taskId: string): ActiveTask | undefined {
    const active = this.activeTasks.get(taskId)
    if (active) return active

    const entry = this.completedTasks.get(taskId)
    if (entry && entry.expiresAt > Date.now()) return entry.task

    return undefined
  }

  /**
   * Return a snapshot of queue metrics.
   */
  getQueueStatus(): TaskQueueStatus {
    let queued = 0
    let running = 0
    const completed = this.completedTasks.size

    for (const task of this.activeTasks.values()) {
      if (task.status === 'running') {
        running++
      } else {
        // queued or paused both count as queued from a metrics perspective
        queued++
      }
    }

    return { queued, running, completed }
  }

  /**
   * Disposable -- abort every active task on shutdown.
   */
  destroy(): void {
    console.log(
      `[TaskExecutor] Destroying, aborting ${this.activeTasks.size} task(s)`
    )
    if (this.gcHandle) {
      clearInterval(this.gcHandle)
      this.gcHandle = null
    }
    for (const task of this.activeTasks.values()) {
      task.controller.abort()
      if (task.timeoutHandle) {
        clearTimeout(task.timeoutHandle)
      }
    }
    this.activeTasks.clear()
    this.completedTasks.clear()
    this.queue = []
    this.runningCount = 0
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /**
   * Process queued tasks whenever execution slots are available.
   * Paused tasks remain in the queue but are skipped.
   */
  private drainQueue(): void {
    let idx = 0
    while (this.runningCount < this.maxConcurrency && idx < this.queue.length) {
      const queued = this.queue[idx]
      const task = this.activeTasks.get(queued.taskId)

      // Skip paused tasks — leave them in the queue
      if (task && task.status === 'paused') {
        idx++
        continue
      }

      // Remove from queue
      this.queue.splice(idx, 1)

      // Skip if already cancelled while in queue
      if (queued.controller.signal.aborted) {
        continue
      }

      this.runningCount++
      this.executeTask(queued)
    }
  }

  /**
   * Execute a single task. Handles lifecycle events, progress reporting,
   * timeout, and cleanup.
   *
   * Does NOT throw -- all errors are caught and delivered as events.
   */
  private async executeTask(queued: QueuedTask): Promise<void> {
    const { taskId, type, input, controller, windowId, timeoutMs } = queued
    const task = this.activeTasks.get(taskId)

    if (!task) {
      this.runningCount--
      this.drainQueue()
      return
    }

    task.status = 'running'
    task.startedAt = Date.now()

    // Set up timeout if specified
    if (timeoutMs !== undefined) {
      task.timeoutHandle = setTimeout(() => {
        console.log(`[TaskExecutor] Task ${taskId} timed out after ${timeoutMs}ms`)
        controller.abort()
      }, timeoutMs)
    }

    this.send(windowId, 'task:event', {
      type: 'started',
      data: { taskId }
    } satisfies TaskEvent)

    this.eventBus.emit('task:started', { taskId, taskType: type, windowId })

    console.log(`[TaskExecutor] Task ${taskId} started (type="${type}")`)

    try {
      const handler = this.registry.get(type)

      const reporter: ProgressReporter = {
        progress: (percent, message?, detail?) => {
          // Don't emit progress if task is already done
          if (!this.activeTasks.has(taskId)) return

          this.send(windowId, 'task:event', {
            type: 'progress',
            data: { taskId, percent, message, detail }
          } satisfies TaskEvent)
        }
      }

      let streamContent = ''

      const streamReporter: StreamReporter = {
        stream: (token: string) => {
          if (!this.activeTasks.has(taskId)) return
          streamContent += token
          this.send(windowId, 'task:event', {
            type: 'stream',
            data: { taskId, token, content: streamContent }
          } satisfies TaskEvent)
        }
      }

      const result = await handler.execute(input, controller.signal, reporter, streamReporter)

      // Task may have been cancelled during execution
      if (!this.activeTasks.has(taskId)) return

      const durationMs = Date.now() - task.startedAt!

      task.status = 'completed'
      task.completedAt = Date.now()
      task.result = result

      this.send(windowId, 'task:event', {
        type: 'completed',
        data: { taskId, result, durationMs }
      } satisfies TaskEvent)

      this.eventBus.emit('task:completed', { taskId, taskType: type, result, durationMs, windowId })

      console.log(`[TaskExecutor] Task ${taskId} completed in ${durationMs}ms`)
    } catch (err) {
      // Task may have been cancelled via cancel()
      if (!this.activeTasks.has(taskId)) return

      if (err instanceof Error && err.name === 'AbortError') {
        console.log(`[TaskExecutor] Task ${taskId} aborted`)
        task.status = 'cancelled'
        task.completedAt = Date.now()

        this.send(windowId, 'task:event', {
          type: 'cancelled',
          data: { taskId }
        } satisfies TaskEvent)

        this.eventBus.emit('task:cancelled', { taskId, taskType: type, windowId })
      } else {
        const message = err instanceof Error ? err.message : String(err)
        const code = err instanceof Error ? err.name : 'UNKNOWN_ERROR'
        console.error(`[TaskExecutor] Task ${taskId} failed:`, err)

        task.status = 'error'
        task.completedAt = Date.now()
        task.error = message

        this.send(windowId, 'task:event', {
          type: 'error',
          data: { taskId, message, code }
        } satisfies TaskEvent)

        this.eventBus.emit('task:failed', { taskId, taskType: type, error: message, code, windowId })
      }
    } finally {
      // Clean up timeout
      if (task.timeoutHandle) {
        clearTimeout(task.timeoutHandle)
        task.timeoutHandle = undefined
      }

      // Move to completed store for TTL-based result retrieval
      this.completedTasks.set(taskId, {
        task: { ...task, controller: undefined as unknown as AbortController },
        expiresAt: Date.now() + COMPLETED_TASK_TTL_MS
      })

      this.activeTasks.delete(taskId)
      this.runningCount--

      console.log(
        `[TaskExecutor] Task ${taskId} (${type}) finished. ` +
          `Running: ${this.runningCount}, Queued: ${this.queue.length}`
      )

      // Process next tasks in queue
      this.drainQueue()
    }
  }

  /** Evict completed tasks whose TTL has expired. */
  private gcCompletedTasks(): void {
    const now = Date.now()
    for (const [taskId, entry] of this.completedTasks) {
      if (entry.expiresAt <= now) {
        this.completedTasks.delete(taskId)
      }
    }
  }

  /**
   * Sort queue by priority (high first), then by FIFO within same priority.
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const priorityDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.queuedAt - b.queuedAt
    })
  }

  /**
   * Send an event to a specific window or broadcast to all windows.
   */
  private send(windowId: number | undefined, channel: string, ...args: unknown[]): void {
    if (windowId !== undefined) {
      this.eventBus.sendTo(windowId, channel, ...args)
    } else {
      this.eventBus.broadcast(channel, ...args)
    }
  }
}
