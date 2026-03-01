/**
 * DemoTaskReaction — reaction handler for the 'demo' task type.
 *
 * Demonstrates the TaskReactionHandler pattern. Each lifecycle method logs
 * a structured message and can be extended to trigger real side-effects
 * (e.g. notifications, analytics, chained task submissions, file writes).
 *
 * Input shape mirrors DemoTaskHandler: { variant: 'fast' | 'slow' | 'streaming' | 'error' }
 */

import type { TaskReactionHandler, TaskSubmittedEvent, TaskStartedEvent, TaskCompletedEvent, TaskFailedEvent, TaskCancelledEvent } from '../TaskReactionHandler'

interface DemoInput {
  variant: 'fast' | 'slow' | 'streaming' | 'error'
}

function isDemoInput(input: unknown): input is DemoInput {
  return (
    typeof input === 'object' &&
    input !== null &&
    'variant' in input &&
    typeof (input as DemoInput).variant === 'string'
  )
}

export class DemoTaskReaction implements TaskReactionHandler {
  readonly taskType = 'demo'

  onSubmitted(event: TaskSubmittedEvent): void {
    const variant = isDemoInput(event.input) ? event.input.variant : 'unknown'
    console.log(
      `[DemoTaskReaction] ▶ Submitted  taskId=${event.taskId} variant=${variant} priority=${event.priority}`,
    )
  }

  onStarted(event: TaskStartedEvent): void {
    console.log(`[DemoTaskReaction] ⚙ Started    taskId=${event.taskId}`)
  }

  onCompleted(event: TaskCompletedEvent): void {
    console.log(
      `[DemoTaskReaction] ✓ Completed  taskId=${event.taskId} duration=${event.durationMs}ms`,
    )
  }

  onFailed(event: TaskFailedEvent): void {
    console.warn(
      `[DemoTaskReaction] ✗ Failed     taskId=${event.taskId} error="${event.error}" code=${event.code}`,
    )
  }

  onCancelled(event: TaskCancelledEvent): void {
    console.log(`[DemoTaskReaction] ⊘ Cancelled  taskId=${event.taskId}`)
  }
}
