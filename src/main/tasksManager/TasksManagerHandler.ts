/**
 * Progress reporter for task execution.
 * Provides a callback interface for tasks to report progress updates.
 */
export interface ProgressReporter {
  /**
   * Report progress for the current task.
   * @param percent - Progress percentage (0-100)
   * @param message - Optional human-readable progress message
   * @param detail - Optional additional detail data
   */
  progress(percent: number, message?: string, detail?: unknown): void
}

/**
 * Stream reporter for real-time token delivery.
 * Used by AI handlers to emit streamed content tokens.
 */
export interface StreamReporter {
  /** Emit a streamed token for real-time content delivery. */
  stream(token: string): void
}

/**
 * Task handler interface for implementing background operations.
 * Uses Strategy pattern to encapsulate task-specific behavior.
 *
 * @template TInput - Input type for the task
 * @template TOutput - Output type for the task
 */
export interface TasksManagerHandler<TInput = unknown, TOutput = unknown> {
  /**
   * Unique identifier for this task type.
   * Used for handler registration and lookup.
   */
  readonly type: string

  /**
   * Optional validation before queueing the task.
   * Throws an error if input is invalid.
   *
   * @param input - Task input to validate
   * @throws Error if validation fails
   */
  validate?(input: TInput): void

  /**
   * Execute the task operation.
   * Must respect AbortSignal for cancellation support.
   *
   * @param input - Task input data
   * @param signal - Abort signal for cancellation
   * @param reporter - Progress reporter for status updates
   * @param streamReporter - Optional stream reporter for token delivery
   * @returns Promise resolving to task output
   */
  execute(
    input: TInput,
    signal: AbortSignal,
    reporter: ProgressReporter,
    streamReporter?: StreamReporter
  ): Promise<TOutput>
}
