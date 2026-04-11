// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------
// Single source of truth for all data shapes used across IPC, models, and providers.
// Used by main, preload, and renderer.
//
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

// ---- AI Models & Providers -------------------------------------------------

export type ThemeVariant = 'light' | 'dark';
export type ThemeMode = ThemeVariant | 'system';

export interface ThemeData {
	readonly background: string;
	readonly foreground: string;
	titleBar: {
		readonly background: string;
		readonly foreground: string;
		readonly title: string;
		readonly sidebarIcon: string;
		readonly historyIcon: string;
	};
}

/**
 * Full theme stored on disk at {userData}/themes/{folderName}/theme.json.
 * Contains metadata and color tokens for both light and dark variants.
 */
export interface Theme {
	readonly name: string;
	readonly description: string;
	readonly author: string;
	readonly version: string;
	readonly license: string;
	readonly light: ThemeData;
	readonly dark: ThemeData;
}

/**
 * Serializable theme metadata returned to the renderer over IPC.
 * `id` is the folder name on disk (serves as a stable identifier).
 */
export interface CustomThemeInfo {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly author: string;
	readonly version: string;
	readonly license: string;
}

export type ProviderId = (typeof PROVIDERS)[number]['id'];
export type AppProviderName = (typeof PROVIDERS)[number]['name'];

export type ModelType =
	| 'text'
	| 'image'
	| 'video'
	| 'multimodal'
	| 'embedding'
	| 'audio'
	| 'code'
	| 'reasoning'
	| 'ocr';

export interface ModelInfo {
	readonly provider: AppProviderName;
	readonly modelId: string;
	readonly name: string;
	readonly type: ModelType;
	readonly contextWindow: number | null;
	readonly maxOutputTokens: number | null;
	readonly knowledgeCutoff?: string;
	readonly inputPricePerMillionTokens?: number;
	readonly cachedInputPricePerMillionTokens?: number;
	readonly outputPricePerMillionTokens?: number | Record<string, number>;
	readonly features?: readonly string[];
	readonly reasoningLevels?: readonly string[];
	readonly toolsSupported?: readonly string[];
	readonly endpoints?: readonly string[];
	readonly snapshots?: readonly string[];
	readonly rateLimits?: string;
	readonly notes?: string;
}

export interface InferenceCapabilities {
	/** When true, callers MUST NOT pass temperature to the API. */
	reasoning: boolean;
	/** Model can accept image/file content in the messages array. */
	vision: boolean;
	/** Model supports incremental token streaming. */
	streaming: boolean;
}

export interface GenerationCapabilities {
	/** Model supports the dedicated image generation API (not just vision input). */
	imageGeneration: boolean;
	/** Model supports the embeddings API. */
	embeddings: boolean;
}

export interface ModelCapabilities {
	inference: InferenceCapabilities;
	generation: GenerationCapabilities;
}

export type ImageSize =
	| '256x256'
	| '512x512'
	| '1024x1024'
	| '1024x1792'
	| '1792x1024'
	| '1536x1024'
	| '1024x1536';

export type ImageQuality = 'standard' | 'hd' | 'low' | 'medium' | 'high';

export type ImageOutputFormat = 'url' | 'b64_json';

export interface ImageGenerationConfig {
	defaultSize: ImageSize;
	defaultQuality: ImageQuality;
	maxImagesPerRequest: number;
	outputFormat: ImageOutputFormat;
	supportedSizes: readonly ImageSize[];
	supportedQualities: readonly ImageQuality[];
}

export type ModelCategory = 'chat' | 'image' | 'embedding';

export interface ModelDescriptor {
	providerId: string;
	id: string;
	name: string;
	description: string;
	contextWindow: string;
	category: ModelCategory;
	capabilities: ModelCapabilities;
	imageGenerationConfig?: ImageGenerationConfig;
}

export interface Provider {
	id: string;
	name: string;
}

export interface Service {
	provider: Provider;
	apiKey: string;
}

// ---- Logs -----------------------------------------------------------------

export type AppLogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/** Serializable log entry passed over IPC to the renderer. */
export interface AppLogEntry {
	timestamp: string;
	level: AppLogLevel;
	source: string;
	message: string;
}

export interface AppStartupInfo {
	startupCount: number;
	isFirstRun: boolean;
	isInitialized: boolean;
}

// ---- Workspace ------------------------------------------------------------

export interface WorkspaceInfo {
	path: string;
	lastOpened: number;
	data: string;
	resources: string;
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

export type TaskState =
	| 'queued'
	| 'started'
	| 'running'
	| 'progress'
	| 'completed'
	| 'error'
	| 'cancelled'
	| 'stream'
	| 'priority-changed';

export interface TaskInfo {
	taskId: string;
	type: string;
	status: TaskState;
	priority: TaskPriority;
	startedAt?: number;
	completedAt?: number;
	windowId?: number;
	error?: string;
	durationMs?: number;
	metadata?: Record<string, unknown>;
}

/** Queue metrics returned by task:queue-status */
export interface TaskQueueStatus {
	queued: number;
	running: number;
	completed: number;
}

/**
 * Flat task event shape — every variant has the same fields.
 *
 * - `state`    — discriminant identifying the lifecycle stage.
 * - `taskId`   — unique identifier of the task this event belongs to.
 * - `data`     — success payload (shape varies per event type); null on error events.
 * - `error`    — error payload; null on success events.
 * - `metadata` — caller-supplied metadata attached at submit time; matches TaskSubmitPayload.metadata.
 */
export interface TaskEvent {
	state: TaskState;
	taskId: string;
	data: unknown;
	error: unknown;
	metadata?: Record<string, unknown>;
}

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

// ---- Files (workspace/resources/files/) ------------------------------------

/** Allowed file extensions for the resources/files/ folder. */
export const RESOURCES_FILES_EXTENSIONS = ['.json', '.md', '.txt', '.pdf'] as const;

export type ResourcesFilesViewMode = 'list' | 'grid';
export type ResourcesFileTypeFilter = 'all' | 'json' | 'markdown' | 'text' | 'pdf';
export type ResourcesFilesSortKey = 'name' | 'createdAt' | 'mimeType' | 'size';
export type ResourcesFilesSortDirection = 'none' | 'asc' | 'desc';

export const RESOURCES_FILE_TYPE_FILTERS: { value: ResourcesFileTypeFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'json', label: 'JSON' },
	{ value: 'markdown', label: 'Markdown' },
	{ value: 'text', label: 'Text' },
	{ value: 'pdf', label: 'PDF' },
];

export interface FileEntry {
	/** Unique identifier — the file's basename within resources/files/ */
	id: string;
	/** Display name (basename) */
	name: string;
	/** Absolute path on disk */
	path: string;
	/** Path relative to the workspace resources/files/ folder */
	relativePath: string;
	/** Size in bytes */
	size: number;
	/** Detected MIME type */
	mimeType: string;
	/** Timestamp (ms) when the file was first imported / detected */
	createdAt: number;
	/** Timestamp (ms) of the last modification on disk */
	modifiedAt: number;
}

export interface FileEntryChangeEvent {
	type: 'added' | 'changed' | 'removed';
	fileId: string;
	filePath: string;
	timestamp: number;
}

export interface ContentEntryChangeEvent {
	type: 'added' | 'changed' | 'removed';
	fileId: string;
	filePath: string;
	timestamp: number;
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
	emoji?: string;
	type: string;
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
 * Payload for fs:delete-folder.
 */
export interface FsDeleteFolderParams {
	/** Absolute path of the directory to delete. */
	folderPath: string;
	/**
	 * When `true` (default), removes the directory recursively.
	 * When `false`, deletion fails for non-empty directories.
	 */
	recursive?: boolean;
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

/**
 * Payload for fs:list-dir.
 */
export interface FsListDirParams {
	/** Absolute path of the directory to list. */
	dirPath: string;
}

/**
 * A single entry returned by fs:list-dir.
 */
export interface FsListDirEntry {
	/** Name of the file or directory (basename only, no path). */
	name: string;
	/** Whether the entry is a directory. */
	isDirectory: boolean;
}

// ---- Document Image --------------------------------------------------------

/**
 * Payload for saving an image file into a document's folder.
 */
export interface SaveDocumentImageParams {
	/** Document UUID. */
	documentId: string;
	/** Desired file name (e.g. "photo.png"). */
	fileName: string;
	/** Base-64 encoded image data (without the data-URI prefix). */
	base64: string;
}

/**
 * Result returned after saving a document image.
 */
export interface SaveDocumentImageResult {
	/** The file name as written to disk. */
	fileName: string;
	/** Absolute path of the saved file on disk. */
	filePath: string;
}

/**
 * Event payload emitted when a file inside a document's images/ folder changes.
 */
export interface DocumentImageChangeEvent {
	/** Whether the image was added, modified, or removed. */
	type: 'added' | 'changed' | 'removed';
	/** The document UUID that owns the image. */
	documentId: string;
	/** File name of the changed image (e.g. "photo.jpg"). */
	fileName: string;
	/** Absolute path to the image file. */
	filePath: string;
	/** Unix timestamp (ms). */
	timestamp: number;
}

/**
 * Info about a single image file inside a document's images/ folder.
 */
export interface DocumentImageInfo {
	/** File name (e.g. "photo.png"). */
	fileName: string;
	/** Absolute path on disk. */
	filePath: string;
	/** File size in bytes. */
	size: number;
}

// ---- Document Config -------------------------------------------------------

/**
 * Per-document configuration combining output file metadata with
 * document-specific model overrides stored in the document's config.json.
 */
export interface DocumentConfig {
	title: string;
	emoji?: string;
	type: string;
	createdAt: string;
	updatedAt: string;
	textModel: string;
	imageModel: string;
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

// ---- IPC Result

/**
 * Standardized IPC error response.
 */
export interface IpcError {
	success: false;
	error: {
		code: string;
		message: string;
		stack?: string;
	};
}

/**
 * Standardized IPC success response.
 */
export interface IpcSuccess<T> {
	success: true;
	data: T;
}

/**
 * Union type for IPC responses.
 */
export type IpcResult<T> = IpcSuccess<T> | IpcError;

// ---- Task Metadata

export const TASK_STATUS_TEXT_KEY = 'statusText';

export function getTaskStatusText(metadata?: Record<string, unknown>): string | undefined {
	const value = metadata?.[TASK_STATUS_TEXT_KEY];
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export function withTaskStatusText(
	metadata: Record<string, unknown> | undefined,
	statusText: string | undefined
): Record<string, unknown> | undefined {
	const next = { ...(metadata ?? {}) };
	const trimmed = statusText?.trim();

	if (trimmed) {
		next[TASK_STATUS_TEXT_KEY] = trimmed;
	} else {
		delete next[TASK_STATUS_TEXT_KEY];
	}

	return Object.keys(next).length > 0 ? next : undefined;
}

export const DEFAULT_TEXT_MODEL_ID = 'gpt-4.1';
