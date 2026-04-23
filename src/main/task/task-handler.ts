import type { TaskEvent } from '../../shared/types';

/**
 * Emit a TaskEvent to the renderer. `taskId` is stamped by the executor.
 */
export type Emit = (event: Omit<TaskEvent, 'taskId'>) => void;

/**
 * Task handler interface for implementing background operations.
 * Uses Strategy pattern to encapsulate task-specific behavior.
 *
 * @template TInput - Input type for the task
 * @template TOutput - Output type for the task
 */
export interface TaskHandler<TInput = unknown, TOutput = unknown> {
	/**
	 * Unique identifier for this task type.
	 * Used for handler registration and lookup.
	 */
	readonly type: string;

	/**
	 * Optional validation before queueing the task.
	 * Throws an error if input is invalid.
	 *
	 * @param input - Task input to validate
	 * @throws Error if validation fails
	 */
	validate?(input: TInput): void;

	/**
	 * Execute the task operation.
	 * Must respect AbortSignal for cancellation support.
	 *
	 * @param input - Task input data
	 * @param signal - Abort signal for cancellation
	 * @param emit - Sink for custom TaskEvents from the handler
	 * @returns Promise resolving to task output
	 */
	execute(input: TInput, signal: AbortSignal, emit: Emit): Promise<TOutput>;
}
