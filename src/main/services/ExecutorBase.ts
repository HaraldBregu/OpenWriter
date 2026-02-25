import type { Disposable } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'

/**
 * Execution record: minimal interface that all execution types must implement.
 * Stores the AbortController and basic metadata for a run/task.
 */
export interface ExecutionRecord {
  id: string
  controller: AbortController
  startedAt: number
}

/**
 * ExecutorBase -- Abstract base class for execution lifecycle management.
 *
 * Shared behavior between PipelineService and TaskExecutorService:
 *   - Track active runs/tasks in a Map
 *   - Create/cancel/check execution records
 *   - Implement Disposable to abort all on shutdown
 *   - Send events via EventBus
 *
 * Subclasses implement:
 *   - start(): Initiate a new execution and drive it in the background
 *   - The specific event emission logic for their domain
 *
 * This eliminates ~60 lines of duplicate lifecycle code while maintaining
 * flexibility for Pipeline-specific vs Task-specific behavior.
 */
export abstract class ExecutorBase<T extends ExecutionRecord> implements Disposable {
  protected activeExecutions = new Map<string, T>()

  constructor(protected readonly eventBus: EventBus) {}

  /**
   * Start a new execution. Subclasses implement domain-specific startup.
   * @returns The execution ID
   */
  abstract start(...args: any[]): Promise<string>

  /**
   * Cancel an in-flight execution by its ID.
   * Returns true if found and cancelled, false otherwise.
   */
  cancel(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId)
    if (!execution) return false

    console.log(`[${this.constructor.name}] Cancelling execution ${executionId}`)
    execution.controller.abort()
    this.activeExecutions.delete(executionId)
    return true
  }

  /**
   * Check if an execution is currently active.
   */
  isRunning(executionId: string): boolean {
    return this.activeExecutions.has(executionId)
  }

  /**
   * Get count of active executions.
   */
  getActiveCount(): number {
    return this.activeExecutions.size
  }

  /**
   * List all active executions (metadata only, no controller).
   */
  listActive(): Array<{ id: string; startedAt: number; duration: number }> {
    const now = Date.now()
    return Array.from(this.activeExecutions.values()).map(({ id, startedAt }) => ({
      id,
      startedAt,
      duration: now - startedAt
    }))
  }

  /**
   * Disposable -- abort all active executions on shutdown.
   */
  destroy(): void {
    console.log(
      `[${this.constructor.name}] Destroying, aborting ${this.activeExecutions.size} active execution(s)`
    )
    for (const execution of this.activeExecutions.values()) {
      execution.controller.abort()
    }
    this.activeExecutions.clear()
  }

  /**
   * Register an execution record (called by subclasses during start).
   */
  protected registerExecution(execution: T): void {
    this.activeExecutions.set(execution.id, execution)
  }

  /**
   * Unregister an execution record (called by subclasses on completion).
   */
  protected unregisterExecution(executionId: string): void {
    this.activeExecutions.delete(executionId)
  }

  /**
   * Send an event to a specific window or broadcast to all windows.
   * (Called by subclasses to emit domain-specific events)
   */
  protected send(windowId: number | undefined, channel: string, ...args: unknown[]): void {
    if (windowId !== undefined) {
      this.eventBus.sendTo(windowId, channel, ...args)
    } else {
      this.eventBus.broadcast(channel, ...args)
    }
  }
}
