// ---------------------------------------------------------------------------
// Shared IPC Data Types
// ---------------------------------------------------------------------------
// Single source of truth for all data shapes exchanged over IPC.
// Used by main, preload, and renderer.
//
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

// ---- Workspace ------------------------------------------------------------

export interface WorkspaceInfo {
	path: string;
	lastOpened: number;
}

export interface WorkspaceChangedEvent {
	currentPath: string | null;
	previousPath: string | null;
}

/**
 * Event emitted when the current workspace folder is detected as deleted,
 * renamed, or otherwise inaccessible while the application is running.
 */
export interface WorkspaceDeletedEvent {
	/** The path that was previously set as the workspace */
	deletedPath: string;
	/** Human-readable reason for the event */
	reason: 'deleted' | 'inaccessible' | 'renamed';
	/** Timestamp when the deletion was detected */
	timestamp: number;
}

// ---- Task -----------------------------------------------------------------

export type TaskPriority = 'low' | 'normal' | 'high';

export interface TaskSubmitOptions {
	taskId?: string;
	priority?: TaskPriority;
	timeoutMs?: number;
	windowId?: number;
}

export interface TaskSubmitPayload<TInput = unknown> {
	type: string;
	input: TInput;
	options?: TaskSubmitOptions;
	metadata?: Record<string, unknown>;
}

export type TaskStatus = 'queued' | 'running' | 'completed' | 'error' | 'cancelled';

export interface TaskInfo {
	taskId: string;
	type: string;
	status: TaskStatus;
	priority: TaskPriority;
	startedAt?: number;
	completedAt?: number;
	windowId?: number;
	error?: string;
	queuePosition?: number;
	durationMs?: number;
}

/** Queue metrics returned by task:queue-status */
export interface TaskQueueStatus {
	queued: number;
	running: number;
	completed: number;
}

export type TaskEvent =
	| { type: 'queued'; data: { taskId: string; taskType: string; position: number } }
	| { type: 'started'; data: { taskId: string } }
	| {
			type: 'progress';
			data: { taskId: string; percent: number; message?: string; detail?: unknown };
	  }
	| { type: 'completed'; data: { taskId: string; result: unknown; durationMs: number } }
	| { type: 'error'; data: { taskId: string; message: string; code: string } }
	| { type: 'cancelled'; data: { taskId: string } }
	| { type: 'stream'; data: { taskId: string; data: string } }
	| { type: 'priority-changed'; data: { taskId: string; priority: TaskPriority; position: number } }
	| { type: 'queue-position'; data: { taskId: string; position: number } };

// ---- Indexing -------------------------------------------------------------

export interface IndexingInfo {
	/** Timestamp of the last successful indexing run. */
	lastIndexedAt: number;
	/** Number of documents successfully indexed. */
	indexedCount: number;
	/** Number of documents that failed during indexing. */
	failedCount: number;
	/** Total chunks stored in the vector store. */
	totalChunks: number;
}

// ---- Resources ------------------------------------------------------------

export interface ResourceInfo {
	id: string;
	name: string;
	path: string;
	size: number;
	mimeType: string;
	importedAt: number;
	lastModified: number;
}

export interface DocumentFileChangeEvent {
	type: 'added' | 'changed' | 'removed';
	fileId: string;
	filePath: string;
	timestamp: number;
}

// ---- Output ---------------------------------------------------------------

export type OutputType = 'documents';

export interface OutputFileMetadata {
	title: string;
	type: OutputType;
	category: string;
	tags: string[];
	visibility: string;
	provider: string;
	model: string;
	temperature?: number;
	maxTokens?: number | null;
	reasoning?: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface OutputFile {
	id: string;
	type: OutputType;
	path: string;
	metadata: OutputFileMetadata;
	content: string;
	savedAt: number;
}

export interface OutputFileChangeEvent {
	type: 'added' | 'changed' | 'removed';
	outputType: string;
	fileId: string;
	filePath: string;
	timestamp: number;
}

export interface SaveOutputInput {
	type: string;
	content: string;
	metadata?: Record<string, unknown>;
}

export interface SaveOutputResult {
	id: string;
	path: string;
	savedAt: number;
}

export interface OutputUpdateParams {
	type: string;
	id: string;
	content: string;
	metadata: Record<string, unknown>;
}

// ---- Directories ----------------------------------------------------------

export interface DirectoryEntry {
	id: string;
	path: string;
	addedAt: number;
	isIndexed: boolean;
	lastIndexedAt?: number;
}

export interface DirectoryAddManyResult {
	added: DirectoryEntry[];
	errors: Array<{ path: string; error: string }>;
}

export interface DirectoryValidationResult {
	valid: boolean;
	error?: string;
}

// ---- Context Menu ---------------------------------------------------------

export interface WritingContextMenuAction {
	action: string;
	writingId: string;
}

// ---- Common ---------------------------------------------------------------

export interface WatcherError {
	error: string;
	timestamp: number;
}

// ---- FileSystem -----------------------------------------------------------

/**
 * Payload for fs:read-file. The result is the raw string content of the file.
 */
export interface FsReadFileParams {
	/** Absolute path to the file to read. */
	filePath: string;
	/** Text encoding (default: 'utf-8'). */
	encoding?: 'utf-8' | 'utf8' | 'ascii' | 'latin1';
}

/**
 * Payload for fs:write-file.
 */
export interface FsWriteFileParams {
	/** Absolute path of the destination file. */
	filePath: string;
	/** String content to write. */
	content: string;
	/** Text encoding (default: 'utf-8'). */
	encoding?: 'utf-8' | 'utf8' | 'ascii' | 'latin1';
	/**
	 * When `true` (default), uses an atomic write-then-rename strategy.
	 * Set to `false` only on filesystems that do not support sibling renames.
	 */
	atomic?: boolean;
	/**
	 * When `true`, creates missing parent directories before writing.
	 * Default: `false`.
	 */
	createParents?: boolean;
}

/**
 * Payload for fs:create-file.
 */
export interface FsCreateFileParams {
	/** Absolute path of the file to create. */
	filePath: string;
	/** Initial text content (default: empty string). */
	content?: string;
	/** Text encoding (default: 'utf-8'). */
	encoding?: 'utf-8' | 'utf8' | 'ascii' | 'latin1';
	/**
	 * When `true`, throws if the file already exists.
	 * Default: `false` (idempotent — silently succeeds if the file exists).
	 */
	failIfExists?: boolean;
	/**
	 * When `true`, creates missing parent directories before creating the file.
	 * Default: `false`.
	 */
	createParents?: boolean;
}

/**
 * Payload for fs:create-folder.
 */
export interface FsCreateFolderParams {
	/** Absolute path of the directory to create. */
	folderPath: string;
	/**
	 * When `true` (default), creates all intermediate ancestors (mkdir -p).
	 * When `false`, throws if the parent does not exist.
	 */
	recursive?: boolean;
	/**
	 * When `true`, throws if the directory already exists.
	 * Default: `false` (idempotent).
	 */
	failIfExists?: boolean;
}

/**
 * Payload for fs:rename.
 */
export interface FsRenameParams {
	/** Current absolute path of the file or directory. */
	oldPath: string;
	/** Desired absolute destination path. */
	newPath: string;
	/**
	 * When `true` (default), throws if `newPath` already exists.
	 * Set to `false` to restore POSIX rename semantics (atomically replaces destination).
	 */
	failIfExists?: boolean;
}

/**
 * Result returned by fs:rename.
 */
export interface FsRenameResult {
	/** The resolved absolute path after the rename. */
	newPath: string;
}

// ---- Project Workspace ----------------------------------------------------

/**
 * Schema for the project_workspace.openwriter file stored in the workspace root.
 * Contains project-level metadata that identifies and describes the workspace.
 */
export interface ProjectWorkspaceInfo {
	/** Schema version for forward compatibility. */
	version: number;
	/** Unique identifier for this project workspace (UUID v4). */
	projectId: string;
	/** Human-readable project name (defaults to the folder name). */
	name: string;
	/** Optional project description. */
	description: string;
	/** ISO 8601 timestamp when the project was first created. */
	createdAt: string;
	/** ISO 8601 timestamp of the last update to this file. */
	updatedAt: string;
	/** Application version that created this project file. */
	appVersion: string;
}

// ---- AI Agents ------------------------------------------------------------

export type AgentStreamEvent =
	| { type: 'token'; token: string; runId: string }
	| { type: 'thinking'; content: string; runId: string }
	| { type: 'done'; content: string; tokenCount: number; runId: string }
	| { type: 'error'; error: string; code: string; runId: string };

export interface AgentDefinitionInfo {
	id: string;
	name: string;
	category: 'writing' | 'editing' | 'analysis' | 'utility';
}
