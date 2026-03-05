/** Tasks slice type definitions — shared enums, progress state, and tracked task shape. */
import type { TaskStatus, TaskPriority } from '../../../../shared/types';

// Re-export shared types so consumers can import everything from this module.
export type { TaskStatus, TaskPriority };

// ---------------------------------------------------------------------------
// Slice-specific types
// ---------------------------------------------------------------------------

export interface TaskProgressState {
  percent: number;
  message?: string;
  detail?: unknown;
}

export interface TaskEventRecord {
  type: string;
  data: unknown;
  receivedAt: number;
}

export interface TrackedTaskState {
  taskId: string;
  type: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: TaskProgressState;
  queuePosition?: number;
  durationMs?: number;
  error?: string;
  result?: unknown;
  metadata?: unknown;
  streamBuffer?: string;
  events: TaskEventRecord[];
}

export interface TasksState {
  tasks: TrackedTaskState[];
}
