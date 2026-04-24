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
	readonly card: string;
	readonly 'card-foreground': string;
	readonly popover: string;
	readonly 'popover-foreground': string;
	readonly primary: string;
	readonly 'primary-foreground': string;
	readonly secondary: string;
	readonly 'secondary-foreground': string;
	readonly muted: string;
	readonly 'muted-foreground': string;
	readonly accent: string;
	readonly 'accent-foreground': string;
	readonly destructive: string;
	readonly 'destructive-foreground': string;
	readonly border: string;
	readonly input: string;
	readonly ring: string;
	readonly radius: string;
	readonly success: string;
	readonly 'success-foreground': string;
	readonly warning: string;
	readonly 'warning-foreground': string;
	readonly info: string;
	readonly 'info-foreground': string;
	readonly 'sidebar-background': string;
	readonly 'sidebar-foreground': string;
	readonly 'sidebar-primary': string;
	readonly 'sidebar-primary-foreground': string;
	readonly 'sidebar-accent': string;
	readonly 'sidebar-accent-foreground': string;
	readonly 'sidebar-border': string;
	readonly 'sidebar-ring': string;
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

/**
 * Serializable skill metadata returned to the renderer over IPC.
 * Mirrors the packaged-skill shape (see src/main/agents/skills) but
 * strips the runtime `instructions` body — the renderer only needs
 * identity + selection hints for display.
 *
 * `id` is the folder name on disk (stable identifier).
 */
export interface SkillInfo {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly scope: 'bundled' | 'user' | 'plugin';
	readonly emoji?: string;
	readonly tags?: readonly string[];
	readonly filePath?: string;
}

export type ProviderId = (typeof PROVIDERS)[number]['id'];
export type ProviderName = (typeof PROVIDERS)[number]['name'];

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
	readonly providerId: ProviderId;
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

export interface Provider {
	id: string;
	name: string;
}

/** Canonical list of known providers. Source of truth for ProviderId and ProviderName. */
export const PROVIDERS = [
	{ id: 'openai', name: 'OpenAI' },
	{ id: 'anthropic', name: 'Anthropic' },
] as const satisfies readonly Provider[];

export interface Service {
	provider: Provider;
	apiKey: string;
}

export type AgentModelRole = 'text' | 'image';

export interface AgentSettings {
	id: string;
	name: string;
	models: Partial<Record<AgentModelRole, string>>;
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
	/**
	 * Project name read from `project_workspace.openwriter` in the workspace root.
	 * `null` when the file is missing or unreadable — consumers should fall back
	 * to the folder basename in that case.
	 */
	name: string | null;
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

export type TaskState = 'queued' | 'started' | 'running' | 'finished' | 'cancelled';

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
	data?: string;
}

/** Queue metrics returned by task:queue-status */
export interface TaskQueueStatus {
	queued: number;
	running: number;
	completed: number;
}

/**
 * Flat task event shape.
 *
 * - `state`    — lifecycle stage.
 * - `taskId`   — unique identifier of the task.
 * - `data`     — stringified payload for this state.
 * - `metadata` — caller-supplied metadata captured at submission time.
 */
export interface TaskEvent {
	state: TaskState;
	taskId: string;
	data: string;
	metadata: Record<string, unknown>;
}

/**
 * Bundled arguments for the task:submit renderer API.
 * One object carries every submit-time property.
 */
export interface TaskAction<TInput = unknown> {
	type: string;
	input: TInput;
	metadata: Record<string, unknown>;
}

/**
 * Return type of the task:submit renderer API.
 */
export type TaskActionReturn = { taskId: string };

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

// ---- Files (workspace/files/) ---------------------------------------------

/** Allowed file extensions for the workspace files/ folder. */
export const FILES_EXTENSIONS = ['.json', '.md', '.txt', '.pdf'] as const;

export type FilesViewMode = 'list' | 'grid';
export type FileTypeFilter =
	| 'all'
	| 'image'
	| 'video'
	| 'audio'
	| 'json'
	| 'markdown'
	| 'text'
	| 'pdf';
export type FilesSortKey = 'name' | 'createdAt' | 'mimeType' | 'size';
export type FilesSortDirection = 'none' | 'asc' | 'desc';

export const FILE_TYPE_FILTERS: { value: FileTypeFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'image', label: 'Images' },
	{ value: 'video', label: 'Video' },
	{ value: 'audio', label: 'Audio' },
	{ value: 'json', label: 'JSON' },
	{ value: 'markdown', label: 'Markdown' },
	{ value: 'text', label: 'Text' },
	{ value: 'pdf', label: 'PDF' },
];

export interface FileEntry {
	/** Unique identifier — the file's basename within files/ */
	id: string;
	/** Display name (basename) */
	name: string;
	/** Absolute path on disk */
	path: string;
	/** Path relative to the workspace files/ folder */
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

// ---- Images (workspace/images/) -------------------------------------------

/** Allowed image extensions for the workspace images/ folder. */
export const IMAGES_EXTENSIONS = [
	'.jpg',
	'.jpeg',
	'.png',
	'.gif',
	'.webp',
	'.svg',
	'.avif',
	'.bmp',
] as const;

export interface ImageEntry {
	/** Unique identifier — the file's basename within images/ */
	id: string;
	/** Display name (basename) */
	name: string;
	/** Absolute path on disk */
	path: string;
	/** Path relative to the workspace images/ folder */
	relativePath: string;
	/** Size in bytes */
	size: number;
	/** Detected MIME type */
	mimeType: string;
	/** Timestamp (ms) when the image was first imported / detected */
	createdAt: number;
	/** Timestamp (ms) of the last modification on disk */
	modifiedAt: number;
}

export interface ImageEntryChangeEvent {
	type: 'added' | 'changed' | 'removed';
	imageId: string;
	imagePath: string;
	timestamp: number;
}

export interface FileEntryChangeEvent {
	type: 'added' | 'changed' | 'removed';
	fileId: string;
	filePath: string;
	timestamp: number;
}

export interface FolderEntry {
	/** Discriminator: 'folder' for directories, 'file' for markdown files */
	kind: 'folder' | 'file';
	/** Unique identifier — the entry's basename within contents/ */
	id: string;
	/** Display name (basename) */
	name: string;
	/** Absolute path on disk */
	path: string;
	/** Path relative to the workspace contents/ folder */
	relativePath: string;
	/** Timestamp (ms) when the entry was first created on disk */
	createdAt: number;
	/** Timestamp (ms) of the last modification on disk */
	modifiedAt: number;
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

/**
 * Descriptor for a single entry in a native context menu shown from the renderer.
 * The main process builds an Electron `Menu` from an ordered array of these and
 * resolves the invocation with the `id` of the clicked item (or `null` if the
 * menu was dismissed without a selection).
 */
export type ContextMenuDescriptor =
	| { type: 'separator' }
	| {
			type?: 'item';
			/** Stable id returned to the renderer when this item is clicked. */
			id: string;
			/** Visible label. */
			label: string;
			/** Optional accelerator, e.g. 'CmdOrCtrl+Backspace'. */
			accelerator?: string;
			/** Defaults to true. */
			enabled?: boolean;
			/** Renders the item in a destructive style where the platform supports it. */
			destructive?: boolean;
	  };

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
 * Payload for fs:delete-file.
 */
export interface FsDeleteFileParams {
	/** Absolute path of the file to delete. */
	filePath: string;
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
	type: string;
	createdAt: string;
	updatedAt: string;
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

// ---- Agent Task Streaming -------------------------------------------------

/**
 * Metadata attached to `type: 'agent'` tasks submitted from the document page.
 * Carries the editor insertion range so main can reflect it back to the
 * renderer on mount-time recovery.
 */
export interface AssistantTaskMetadata {
	sessionId: string;
	documentId: string;
	posFrom: number;
	posTo: number;
}

/** Renderer-facing payload for the `task:submit` input when `type === 'agent'`. */
export interface AgentTaskSubmitInput {
	agentType: 'assistant' | 'text-writer' | 'text-generator-v2' | 'rag' | 'ocr';
	input: {
		prompt?: string;
		raw?: string;
		files: { name: string; mimeType?: string }[];
	};
}

/** Display phase surfaced to the status bar. Derived on main from AgentEvent kinds. */
export type AgentPhase =
	| 'queued'
	| 'thinking'
	| 'writing'
	| 'generating-image'
	| 'completed'
	| 'error'
	| 'cancelled';

/** Payload for AgentEvent.kind === 'phase'. */
export interface AgentPhasePayload {
	phase: AgentPhase;
	label: string;
}

/** Payload for AgentEvent.kind === 'delta'. `fullContent` is authoritative for recovery. */
export interface AgentDeltaPayload {
	token: string;
	fullContent: string;
}

/**
 * Return value of AgentTaskHandler.execute. Appears on the wire as
 * `TaskEvent.data.result` when `state === 'completed'`.
 */
export interface AgentCompletedOutput {
	content: string;
	stoppedReason: 'done' | 'max-steps' | 'stagnation';
}

/**
 * Projection-rebuilt snapshot used for page-refresh recovery. Returned by
 * the `task:get-snapshot` IPC channel.
 */
export interface AgentTaskSnapshot {
	taskId: string;
	state: TaskState;
	phase: AgentPhase;
	fullContent: string;
	metadata: AssistantTaskMetadata;
	startedAt?: number;
}

/**
 * Return value of the `task:find-for-document` IPC channel. Scans both active
 * and recently-completed tasks (within `COMPLETED_TASK_TTL_MS`) to support
 * the unmount-during-completion edge case.
 */
export interface AgentTaskLookupResult {
	taskId: string;
	state: TaskState;
	metadata: AssistantTaskMetadata;
	result?: AgentCompletedOutput;
	completedAt?: number;
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

export type {
	ExtensionActivationEvent,
	ExtensionAppInfo,
	ExtensionCapability,
	ExtensionCommandAvailability,
	ExtensionCommandContribution,
	ExtensionCommandExecutionResult,
	ExtensionCommandInfo,
	ExtensionCommandQuery,
	ExtensionDocPageContribution,
	ExtensionDocPanelBlock,
	ExtensionDocPanelButtonAction,
	ExtensionDocPanelBlocksContent,
	ExtensionDocPanelClientMessage,
	ExtensionDocPanelContent,
	ExtensionDocPanelContentChangedPayload,
	ExtensionDocPanelContribution,
	ExtensionDocPanelHostMessage,
	ExtensionDocPanelHtmlContent,
	ExtensionDocPanelInfo,
	ExtensionDocPanelInitPayload,
	ExtensionDocPanelKeyValueItem,
	ExtensionDocPanelNoticeTone,
	ExtensionDocPanelRenderContext,
	ExtensionDocPanelRenderReason,
	ExtensionDocPanelsChangedPayload,
	ExtensionDocumentContextSnapshot,
	ExtensionDocumentEditorStateSnapshot,
	ExtensionDocumentSelectionSnapshot,
	ExtensionDocumentChangedEvent,
	ExtensionDocumentSnapshot,
	ExtensionDocumentUpdate,
	ExtensionEventPayloadMap,
	ExtensionEventType,
	ExtensionExecutionContext,
	ExtensionHostRequestMap,
	ExtensionInfo,
	ExtensionManifest,
	ExtensionPreferenceContribution,
	ExtensionPreferenceOption,
	ExtensionPreferenceType,
	ExtensionRegistrySnapshot,
	ExtensionRuntimeChangedPayload,
	ExtensionRuntimeInfo,
	ExtensionRuntimeState,
	ExtensionSource,
	ExtensionTaskEvent,
	ExtensionTaskState,
	ExtensionTaskSubmission,
	ExtensionTaskSubmissionResult,
	ExtensionWorkspaceChangedEvent,
	ExtensionWorkspaceSnapshot,
} from '../../packages/openwriter-extension-types/src/index';
