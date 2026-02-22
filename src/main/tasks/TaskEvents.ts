/**
 * Task event types for progress tracking and status updates.
 * Follows discriminated union pattern for type safety.
 */

export type TaskEvent =
  | {
      type: 'queued'
      data: {
        taskId: string
        position: number
      }
    }
  | {
      type: 'started'
      data: {
        taskId: string
      }
    }
  | {
      type: 'progress'
      data: {
        taskId: string
        percent: number
        message?: string
        detail?: unknown
      }
    }
  | {
      type: 'completed'
      data: {
        taskId: string
        result: unknown
        durationMs: number
      }
    }
  | {
      type: 'error'
      data: {
        taskId: string
        message: string
        code?: string
      }
    }
  | {
      type: 'cancelled'
      data: {
        taskId: string
      }
    }
