/**
 * TaskReactionRegistry — maps task types to their registered reaction handlers.
 *
 * Mirrors the TaskHandlerRegistry pattern but holds side-effect observers
 * rather than executors. Multiple handlers per type are supported (fan-out).
 * Wildcard handlers (taskType = '*') receive every lifecycle event.
 */

import type { TaskReactionHandler } from './TaskReactionHandler'

export class TaskReactionRegistry {
  private readonly handlers = new Map<string, TaskReactionHandler[]>()

  /**
   * Register a reaction handler.
   * Multiple handlers for the same taskType are accumulated (fan-out dispatch).
   */
  register(handler: TaskReactionHandler): void {
    const existing = this.handlers.get(handler.taskType) ?? []
    existing.push(handler)
    this.handlers.set(handler.taskType, existing)
    console.log(`[TaskReactionRegistry] Registered reaction for type="${handler.taskType}"`)
  }

  /**
   * Return all handlers that should be called for a given task type.
   * Includes both type-specific handlers and wildcard ('*') handlers.
   */
  getForType(taskType: string): TaskReactionHandler[] {
    const specific = this.handlers.get(taskType) ?? []
    const wildcard = this.handlers.get('*') ?? []
    return [...specific, ...wildcard]
  }

  /**
   * List all registered task types (including '*' if any wildcard handlers exist).
   */
  listTypes(): string[] {
    return Array.from(this.handlers.keys())
  }
}
