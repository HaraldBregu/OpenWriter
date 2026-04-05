import { AsyncLocalStorage } from 'node:async_hooks';

export interface TaskExecutionContext {
	taskId: string;
	taskType: string;
	signal: AbortSignal;
	windowId?: number;
	metadata?: Record<string, unknown>;
}

const taskExecutionContextStorage = new AsyncLocalStorage<TaskExecutionContext>();

export function runWithTaskExecutionContext<T>(
	context: TaskExecutionContext,
	callback: () => T
): T {
	return taskExecutionContextStorage.run(context, callback);
}

export function getTaskExecutionContext(): TaskExecutionContext | undefined {
	return taskExecutionContextStorage.getStore();
}
