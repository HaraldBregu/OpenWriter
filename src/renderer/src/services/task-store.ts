import type { TaskEvent, TaskInfo, TaskPriority, TaskStatus } from '../../../shared/types';
import { withTaskStatusText } from '../../../shared/task-metadata';

/** Safely extract a property from an unknown payload. */
function dataField<T>(data: unknown, key: string): T | undefined {
	if (typeof data === 'object' && data !== null && key in data) {
		return (data as Record<string, unknown>)[key] as T;
	}
	return undefined;
}

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
		durationMs: task.durationMs,
		error: task.error,
		metadata: task.metadata,
		streamBuffer: '',
		events: [],
	};
}

function createTrackedTaskFromQueuedEvent(event: TaskEvent): TrackedTaskState {
	return {
		taskId: event.taskId,
		type: '',
		status: 'queued',
		priority: 'normal',
		progress: { percent: 0 },
		metadata:
			event.metadata !== undefined && event.metadata !== null
				? (event.metadata as Record<string, unknown>)
				: undefined,
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
			durationMs: activeTask.durationMs ?? currentTask.durationMs,
			error: activeTask.error ?? currentTask.error,
			metadata: activeTask.metadata ?? currentTask.metadata,
			progress: activeTask.status === 'completed' ? { percent: 100 } : currentTask.progress,
		};

		if (
			currentTask.type !== mergedTask.type ||
			currentTask.status !== mergedTask.status ||
			currentTask.priority !== mergedTask.priority ||
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
	const { taskId } = event;
	if (!taskId) return;

	const eventMetadata =
		event.metadata !== undefined && event.metadata !== null
			? (event.metadata as Record<string, unknown>)
			: undefined;

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
					return {
						...nextTask,
						status: 'queued',
					};
				}
				case 'started':
					return {
						...nextTask,
						status: 'started',
					};
				case 'progress': {
					return {
						...nextTask,
						status: 'running',
						progress: {
							percent: dataField<number>(event.data, 'percent') ?? 0,
							message: dataField<string>(event.data, 'message'),
							detail: dataField<unknown>(event.data, 'detail'),
						},
					};
				}
				case 'stream': {
					return {
						...nextTask,
						status: 'running',
						streamBuffer:
							(nextTask.streamBuffer ?? '') +
							(dataField<string>(event.data, 'data') ?? ''),
					};
				}
				case 'completed': {
					return {
						...nextTask,
						status: 'completed',
						progress: { percent: 100 },
						result: dataField<unknown>(event.data, 'result'),
						durationMs: dataField<number>(event.data, 'durationMs'),
						streamBuffer: '',
					};
				}
				case 'error': {
					const errorPayload = event.error;
					const errorMessage =
						typeof errorPayload === 'object' &&
						errorPayload !== null &&
						'message' in errorPayload
							? String((errorPayload as { message: unknown }).message)
							: typeof errorPayload === 'string'
								? errorPayload
								: undefined;
					return {
						...nextTask,
						status: 'error',
						error: errorMessage,
						streamBuffer: '',
					};
				}
				case 'cancelled':
					return {
						...nextTask,
						status: 'cancelled',
						streamBuffer: '',
					};
				case 'priority-changed': {
					return {
						...nextTask,
						priority:
							dataField<TaskPriority>(event.data, 'priority') ?? nextTask.priority,
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
