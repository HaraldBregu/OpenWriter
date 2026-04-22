import type { TaskState, TaskPriority } from '../../../../../../shared/types';

export interface TaskEventRecord {
	state: TaskState;
	data: { taskId: string; data: unknown; error: unknown; metadata: unknown };
	receivedAt: number;
}

export interface TrackedTask {
	taskId: string;
	type: string;
	status: TaskState;
	priority: TaskPriority;
	progress: { percent: number; message?: string; detail?: unknown };
	durationMs?: number;
	error?: string;
	result?: unknown;
	metadata?: Record<string, unknown>;
	events: TaskEventRecord[];
}

export interface QueueStats {
	queued: number;
	running: number;
	completed: number;
	error: number;
	cancelled: number;
}
