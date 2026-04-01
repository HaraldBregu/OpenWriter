import type { TaskEvent, TaskInfo, TaskPriority, TaskStatus } from '../../../shared/types';
import { withTaskStatusText } from '../../../shared/task-metadata';

export type { TaskPriority, TaskStatus };

export interface TaskProgressState {
	percent: number;
	message?: string;
	detail?: unknown;
}

export interface TaskEventRecord {
	type: TaskEvent['type'];
	data: { taskId: string; data: unknown; error: unknown; metadata: unknown };
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
	metadata?: Record<string, unknown>;
	streamBuffer?: string;
	events: TaskEventRecord[];
}

export interface TrackedTaskQueueStats {
	queued: number;
	running: number;
	completed: number;
	error: number;
	cancelled: number;
}

interface AddTaskInput {
	taskId: string;
	type: string;
	priority?: TaskPriority;
	metadata?: Record<string, unknown>;
}

const MAX_EVENT_HISTORY = 50;
const EMPTY_STATS: TrackedTaskQueueStats = {
	queued: 0,
	running: 0,
	completed: 0,
	error: 0,
	cancelled: 0,
};

const listeners = new Set<() => void>();
let trackedTasks: TrackedTaskState[] = [];
let eventsListening = false;
let activeTasksLoaded = false;

function notifyListeners(): void {
	for (const listener of listeners) {
		listener();
	}
}

function ensureTaskStoreInitialized(): void {
	if (!eventsListening && typeof window.task?.onEvent === 'function') {
		eventsListening = true;
		window.task.onEvent((event: TaskEvent) => {
			applyTaskEvent(event);
		});
	}

	if (!activeTasksLoaded && typeof window.task?.list === 'function') {
		activeTasksLoaded = true;
		window.task
			.list()
			.then((result) => {
				if (!result.success) return;
				mergeActiveTasks(result.data);
			})
			.catch(() => {
				// Best-effort snapshot hydration for the debug UI.
			});
	}
}

function appendEvent(task: TrackedTaskState, event: TaskEvent): TaskEventRecord[] {
	const record: TaskEventRecord = {
		type: event.type,
		data: { taskId: event.taskId, data: event.data, error: event.error, metadata: event.metadata },
		receivedAt: Date.now(),
	};
	const nextEvents =
		task.events.length >= MAX_EVENT_HISTORY ? task.events.slice(1) : task.events.slice();
	nextEvents.push(record);
	return nextEvents;
}

function createTrackedTask(input: AddTaskInput): TrackedTaskState {
	return {
		taskId: input.taskId,
		type: input.type,
		status: 'queued',
		priority: input.priority ?? 'normal',
		progress: { percent: 0 },
		metadata: withTaskStatusText(input.metadata, 'Queued'),
		streamBuffer: '',
		events: [],
	};
}

function createTrackedTaskFromInfo(task: TaskInfo): TrackedTaskState {
	return {
		taskId: task.taskId,
		type: task.type,
		status: task.status,
		priority: task.priority,
		progress: { percent: task.status === 'completed' ? 100 : 0 },
		queuePosition: task.queuePosition,
		durationMs: task.durationMs,
		error: task.error,
		metadata: task.metadata,
		streamBuffer: '',
		events: [],
	};
}

function createTrackedTaskFromQueuedEvent(
	event: Extract<TaskEvent, { type: 'queued' }>
): TrackedTaskState {
	const payload = event.data.data;
	return {
		taskId: payload?.taskId ?? '',
		type: (payload as { taskType?: string } | null)?.taskType ?? '',
		status: 'queued',
		priority: 'normal',
		progress: { percent: 0 },
		queuePosition: (payload as { position?: number } | null)?.position,
		metadata: payload?.metadata,
		streamBuffer: '',
		events: [],
	};
}

function updateTrackedTask(
	taskId: string,
	updater: (task: TrackedTaskState) => TrackedTaskState,
	createTask?: () => TrackedTaskState | null
): boolean {
	const index = trackedTasks.findIndex((task) => task.taskId === taskId);
	if (index === -1) {
		const newTask = createTask?.();
		if (!newTask) return false;
		trackedTasks = [...trackedTasks, updater(newTask)];
		notifyListeners();
		return true;
	}

	const currentTask = trackedTasks[index];
	const nextTask = updater(currentTask);
	if (nextTask === currentTask) return false;

	trackedTasks = [...trackedTasks.slice(0, index), nextTask, ...trackedTasks.slice(index + 1)];
	notifyListeners();
	return true;
}

function mergeActiveTasks(activeTasks: TaskInfo[]): void {
	let nextTasks = trackedTasks;
	let changed = false;

	for (const activeTask of activeTasks) {
		const index = nextTasks.findIndex((task) => task.taskId === activeTask.taskId);
		if (index === -1) {
			nextTasks = [...nextTasks, createTrackedTaskFromInfo(activeTask)];
			changed = true;
			continue;
		}

		const currentTask = nextTasks[index];
		const mergedTask: TrackedTaskState = {
			...currentTask,
			type: activeTask.type || currentTask.type,
			status: activeTask.status,
			priority: activeTask.priority,
			queuePosition: activeTask.queuePosition,
			durationMs: activeTask.durationMs ?? currentTask.durationMs,
			error: activeTask.error ?? currentTask.error,
			metadata: activeTask.metadata ?? currentTask.metadata,
			progress: activeTask.status === 'completed' ? { percent: 100 } : currentTask.progress,
		};

		if (
			currentTask.type !== mergedTask.type ||
			currentTask.status !== mergedTask.status ||
			currentTask.priority !== mergedTask.priority ||
			currentTask.queuePosition !== mergedTask.queuePosition ||
			currentTask.durationMs !== mergedTask.durationMs ||
			currentTask.error !== mergedTask.error ||
			currentTask.metadata !== mergedTask.metadata ||
			currentTask.progress !== mergedTask.progress
		) {
			nextTasks = [...nextTasks.slice(0, index), mergedTask, ...nextTasks.slice(index + 1)];
			changed = true;
		}
	}

	if (changed) {
		trackedTasks = nextTasks;
		notifyListeners();
	}
}

export function initializeTaskStore(): void {
	ensureTaskStoreInitialized();
}

export function subscribeToTaskStore(listener: () => void): () => void {
	ensureTaskStoreInitialized();
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function addTask(input: AddTaskInput): void {
	ensureTaskStoreInitialized();
	if (trackedTasks.some((task) => task.taskId === input.taskId)) {
		return;
	}

	trackedTasks = [...trackedTasks, createTrackedTask(input)];
	notifyListeners();
}

export function removeTask(taskId: string): void {
	const nextTasks = trackedTasks.filter((task) => task.taskId !== taskId);
	if (nextTasks.length === trackedTasks.length) {
		return;
	}

	trackedTasks = nextTasks;
	notifyListeners();
}

export function applyTaskEvent(event: TaskEvent): void {
	const payload = event.data;
	const taskId = payload.data?.taskId ?? payload.error?.taskId;
	if (!taskId) return;

	const eventMetadata = payload.data?.metadata ?? payload.error?.metadata;

	updateTrackedTask(
		taskId,
		(task) => {
			const nextTask: TrackedTaskState = {
				...task,
				events: appendEvent(task, event),
				metadata: eventMetadata !== undefined ? eventMetadata : task.metadata,
			};

			switch (event.type) {
				case 'queued': {
					const qd = event.data.data;
					return {
						...nextTask,
						type: (qd as { taskType?: string } | null)?.taskType || nextTask.type,
						status: 'queued',
						queuePosition: (qd as { position?: number } | null)?.position,
					};
				}
				case 'started':
					return {
						...nextTask,
						status: 'started',
						queuePosition: undefined,
					};
				case 'progress': {
					const pd = event.data.data;
					return {
						...nextTask,
						status: 'running',
						progress: {
							percent: (pd as { percent?: number } | null)?.percent ?? 0,
							message: (pd as { message?: string } | null)?.message,
							detail: (pd as { detail?: unknown } | null)?.detail,
						},
					};
				}
				case 'stream': {
					const sd = event.data.data;
					return {
						...nextTask,
						status: 'running',
						streamBuffer:
							(nextTask.streamBuffer ?? '') + ((sd as { data?: string } | null)?.data ?? ''),
					};
				}
				case 'completed': {
					const cd = event.data.data;
					return {
						...nextTask,
						status: 'completed',
						progress: { percent: 100 },
						result: (cd as { result?: unknown } | null)?.result,
						durationMs: (cd as { durationMs?: number } | null)?.durationMs,
						queuePosition: undefined,
						streamBuffer: '',
					};
				}
				case 'error':
					return {
						...nextTask,
						status: 'error',
						error: event.data.error?.message,
						queuePosition: undefined,
						streamBuffer: '',
					};
				case 'cancelled':
					return {
						...nextTask,
						status: 'cancelled',
						queuePosition: undefined,
						streamBuffer: '',
					};
				case 'priority-changed': {
					const pcd = event.data.data;
					return {
						...nextTask,
						priority: (pcd as { priority?: TaskPriority } | null)?.priority ?? nextTask.priority,
						queuePosition: (pcd as { position?: number } | null)?.position,
					};
				}
				case 'queue-position': {
					const qpd = event.data.data;
					return {
						...nextTask,
						queuePosition: (qpd as { position?: number } | null)?.position,
					};
				}
			}
		},
		() => (event.type === 'queued' ? createTrackedTaskFromQueuedEvent(event) : null)
	);
}

export function getTrackedTask(taskId: string): TrackedTaskState | undefined {
	return trackedTasks.find((task) => task.taskId === taskId);
}

export function getTrackedTasks(): TrackedTaskState[] {
	return trackedTasks;
}

export function getTrackedTaskQueueStats(): TrackedTaskQueueStats {
	return trackedTasks.reduce<TrackedTaskQueueStats>(
		(stats, task) => {
			if (task.status in stats) {
				stats[task.status as keyof TrackedTaskQueueStats] += 1;
			}
			return stats;
		},
		{ ...EMPTY_STATS }
	);
}
