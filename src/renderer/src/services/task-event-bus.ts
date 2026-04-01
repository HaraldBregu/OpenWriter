/**
 * taskEventBus — module-level singleton for subscribing to task events.
 *
 * Provides a single window.task.onEvent subscription (lazy-init on
 * first use) shared across all callers. Individual callers subscribe via
 * subscribeToTask(taskId, cb), and only callbacks for the matching taskId
 * are invoked when an event arrives.
 *
 * This avoids the need for a React context to distribute task events.
 */

import type { TaskEvent } from '../../../shared/types';

// ---------------------------------------------------------------------------
// Snapshot shape delivered to per-task subscribers
// ---------------------------------------------------------------------------

export interface TaskSnapshot {
	status: string;
	streamedContent: string; // latest delta token only
	content: string; // seedContent + all AI tokens (full display text)
	seedContent: string; // original text before AI enhancement (set by initTaskContent)
	error?: string;
	result?: unknown;
	/** Caller-supplied metadata attached at submit time via initTaskMetadata. */
	metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Per-task subscriber sets: taskId → Set<callback> */
const subscribers = new Map<string, Set<(snap: TaskSnapshot) => void>>();

/** Per-type subscriber sets: taskType → Set<callback(taskId)> */
const typeSubscribers = new Map<string, Set<(taskId: string) => void>>();

/** Accumulated snapshots per task so late subscribers can replay. */
const snapshots = new Map<string, TaskSnapshot>();

/** The single unsub handle from window.task.onEvent. */
let globalUnsub: (() => void) | null = null;

// ---------------------------------------------------------------------------
// Lazy-init: subscribe to the global IPC event stream once on first use.
// ---------------------------------------------------------------------------

function ensureListening(): void {
	if (globalUnsub !== null) return;
	if (typeof window.task?.onEvent !== 'function') return;

	globalUnsub = window.task.onEvent((event: TaskEvent) => {
		const { taskId } = event;
		if (!taskId) return;

		// Build or update snapshot for this task.
		const prev = snapshots.get(taskId) ?? {
			status: 'queued',
			streamedContent: '',
			content: '',
			seedContent: '',
		};
		let next: TaskSnapshot;

		// Extract metadata from the flat event.
		const eventMetadata =
			event.metadata !== undefined && event.metadata !== null
				? (event.metadata as Record<string, unknown>)
				: undefined;
		const metadataOverride = eventMetadata !== undefined ? { metadata: eventMetadata } : {};

		switch (event.type) {
			case 'queued': {
				next = {
					...prev,
					status: 'queued',
					...metadataOverride,
				};
				const taskType = event.data?.taskType;
				if (taskType) {
					typeSubscribers.get(taskType)?.forEach((cb) => cb(taskId));
				}
				break;
			}
			case 'started':
				next = { ...prev, status: 'started', ...metadataOverride };
				break;
			case 'progress':
				next = {
					...prev,
					status: 'running',
					streamedContent: '',
					...metadataOverride,
				};
				break;
			case 'stream': {
				const streamData = event.data?.data ?? '';
				next = {
					...prev,
					status: 'running',
					streamedContent: streamData,
					content: (prev.seedContent ?? '') + (prev.content + streamData),
					...metadataOverride,
				};
				break;
			}
			case 'completed': {
				const completedResult = event.data?.result;
				next = {
					...prev,
					status: 'completed',
					streamedContent: '',
					result: completedResult,
					...metadataOverride,
				};
				snapshots.set(taskId, next);
				subscribers.get(taskId)?.forEach((cb) => cb(next));
				// Clear snapshot after all subscribers have processed the terminal event.
				setTimeout(() => snapshots.delete(taskId), 0);
				return;
			}
			case 'error': {
				const errorPayload = event.error;
				const errorMessage =
					typeof errorPayload === 'object' && errorPayload !== null && 'message' in errorPayload
						? String((errorPayload as { message: unknown }).message)
						: typeof errorPayload === 'string'
							? errorPayload
							: undefined;
				next = {
					...prev,
					status: 'error',
					error: errorMessage,
					...metadataOverride,
				};
				snapshots.set(taskId, next);
				subscribers.get(taskId)?.forEach((cb) => cb(next));
				setTimeout(() => snapshots.delete(taskId), 0);
				return;
			}
			case 'cancelled':
				next = { ...prev, status: 'cancelled', ...metadataOverride };
				snapshots.set(taskId, next);
				subscribers.get(taskId)?.forEach((cb) => cb(next));
				setTimeout(() => snapshots.delete(taskId), 0);
				return;
			default:
				next = prev;
		}

		snapshots.set(taskId, next);

		// Notify subscribers for this specific task.
		subscribers.get(taskId)?.forEach((cb) => cb(next));
	});
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * subscribeToTask — register a callback for events on a single task.
 *
 * The callback fires synchronously whenever a task event for `taskId` arrives.
 * Returns an unsubscribe function; call it to stop receiving events.
 *
 * @param taskId  The task ID to subscribe to.
 * @param cb      Called with the latest TaskSnapshot on every event.
 * @returns       Unsubscribe function.
 */
export function subscribeToTask(taskId: string, cb: (snap: TaskSnapshot) => void): () => void {
	ensureListening();

	let set = subscribers.get(taskId);
	if (!set) {
		set = new Set();
		subscribers.set(taskId, set);
	}
	set.add(cb);

	// Replay the current snapshot so late subscribers see the current state
	// (e.g. 'started') even if the event arrived before subscription.
	const existing = snapshots.get(taskId);
	if (existing) {
		cb(existing);
	}

	return () => {
		const s = subscribers.get(taskId);
		if (!s) return;
		s.delete(cb);
		if (s.size === 0) {
			subscribers.delete(taskId);
			// Do NOT delete the snapshot here — it must survive re-mounts mid-stream.
			// Snapshots are cleared after terminal events (completed/error/cancelled).
		}
	};
}

/**
 * Returns the latest snapshot for a task, or undefined if unknown.
 * Useful for reading current state on mount without waiting for the next event.
 */
export function getTaskSnapshot(taskId: string): TaskSnapshot | undefined {
	return snapshots.get(taskId);
}

/**
 * subscribeToTaskType — register a callback that fires when a task of a given
 * type is queued. Returns an unsubscribe function.
 */
export function subscribeToTaskType(taskType: string, cb: (taskId: string) => void): () => void {
	ensureListening();

	let set = typeSubscribers.get(taskType);
	if (!set) {
		set = new Set();
		typeSubscribers.set(taskType, set);
	}
	set.add(cb);

	return () => {
		const s = typeSubscribers.get(taskType);
		if (!s) return;
		s.delete(cb);
		if (s.size === 0) {
			typeSubscribers.delete(taskType);
		}
	};
}

/**
 * Seed the cumulative `content` field for a task before streaming begins.
 * Call this with the original text so that streamed tokens are appended to it.
 */
export function initTaskContent(taskId: string, initialContent: string): void {
	const prev = snapshots.get(taskId) ?? {
		status: 'queued',
		streamedContent: '',
		content: '',
		seedContent: '',
	};
	const next: TaskSnapshot = { ...prev, seedContent: initialContent, content: initialContent };
	snapshots.set(taskId, next);
}

/**
 * Attach caller-supplied metadata to a task's snapshot.
 *
 * Call this immediately after obtaining the taskId from `window.task.submit()`
 * so that every subsequent TaskSnapshot delivered to `subscribeToTask` subscribers
 * includes the metadata. The metadata is carried across all snapshot transitions
 * (started, stream, progress, completed, error, cancelled).
 */
export function initTaskMetadata(taskId: string, metadata: Record<string, unknown>): void {
	const prev = snapshots.get(taskId) ?? {
		status: 'queued',
		streamedContent: '',
		content: '',
		seedContent: '',
	};
	const next: TaskSnapshot = { ...prev, metadata };
	snapshots.set(taskId, next);
}

export const taskEventBus = {
	subscribeToTask,
	subscribeToTaskType,
	getTaskSnapshot,
	initTaskContent,
	initTaskMetadata,
};
