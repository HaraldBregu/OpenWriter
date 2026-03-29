import type { TaskEvent, TaskInfo, TaskPriority, TaskStatus } from '../../../shared/types';

export type { TaskPriority, TaskStatus };

export interface TaskProgressState {
	percent: number;
	message?: string;
	detail?: unknown;
}

export interface TaskEventRecord {
	type: TaskEvent['type'];
	data: TaskEvent['data'];
	receivedAt: number;
}

export interface TrackedTaskState {
	taskId: string;
	type: string;
	status: TaskStatus;
	priority: TaskPriority;
	stateMessage?: string;
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
		data: event.data,
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
		stateMessage: 'Queued',
		progress: { percent: 0 },
		metadata: input.metadata,
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
		stateMessage: task.stateMessage,
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
	return {
		taskId: event.data.taskId,
		type: event.data.taskType,
		status: 'queued',
		priority: 'normal',
		stateMessage: event.data.stateMessage,
		progress: { percent: 0 },
		queuePosition: event.data.position,
		metadata: event.data.metadata,
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
			stateMessage: activeTask.stateMessage ?? currentTask.stateMessage,
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
			currentTask.stateMessage !== mergedTask.stateMessage ||
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
	const taskId = event.data.taskId;
	if (!taskId) return;

	updateTrackedTask(
		taskId,
		(task) => {
			const resolvedStateMessage =
				event.data.stateMessage ??
				(event.type === 'progress' ? event.data.message : undefined) ??
				task.stateMessage;
			const nextTask: TrackedTaskState = {
				...task,
				events: appendEvent(task, event),
				metadata: event.data.metadata !== undefined ? event.data.metadata : task.metadata,
				stateMessage: resolvedStateMessage,
			};

			switch (event.type) {
				case 'queued':
					return {
						...nextTask,
						type: event.data.taskType || nextTask.type,
						status: 'queued',
						queuePosition: event.data.position,
					};
				case 'started':
					return {
						...nextTask,
						status: 'started',
						queuePosition: undefined,
					};
				case 'progress':
					return {
						...nextTask,
						status: 'running',
						progress: {
							percent: event.data.percent,
							message: event.data.message,
							detail: event.data.detail,
						},
					};
				case 'stream':
					return {
						...nextTask,
						status: 'running',
						streamBuffer: (nextTask.streamBuffer ?? '') + event.data.data,
					};
				case 'completed':
					return {
						...nextTask,
						status: 'completed',
						progress: { percent: 100 },
						result: event.data.result,
						durationMs: event.data.durationMs,
						queuePosition: undefined,
						streamBuffer: '',
					};
				case 'error':
					return {
						...nextTask,
						status: 'error',
						error: event.data.message,
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
				case 'priority-changed':
					return {
						...nextTask,
						priority: event.data.priority,
						queuePosition: event.data.position,
					};
				case 'queue-position':
					return {
						...nextTask,
						queuePosition: event.data.position,
					};
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
