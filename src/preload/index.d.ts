// ---------------------------------------------------------------------------
// Preload API Type Declarations
// ---------------------------------------------------------------------------
// These declarations extend the browser's global Window interface so that
// renderer code can access window.app, window.win, etc. with full type safety.
//
// The interface Window block MUST live inside `declare global` so TypeScript
// treats this as a module-augmentation rather than a standalone interface
// declaration.  Without `declare global` the renderer tsconfig (which includes
// this file as a global type) cannot merge it into `Window & typeof globalThis`.
// ---------------------------------------------------------------------------

import type {
	WorkspaceInfo,
	WorkspaceChangedEvent,
	WorkspaceDeletedEvent,
	IndexingInfo,
	ResourceInfo,
	DocumentFileChangeEvent,
	FileEntry,
	FileEntryChangeEvent,
	TaskSubmitPayload,
	TaskInfo,
	TaskEvent,
	TaskPriority,
	TaskQueueStatus,
	OutputFile,
	OutputFileChangeEvent,
	SaveOutputInput,
	SaveOutputResult,
	OutputUpdateParams,
	DirectoryEntry,
	DirectoryAddManyResult,
	DirectoryValidationResult,
	WritingContextMenuAction,
	WatcherError,
	AgentStreamEvent,
	AgentDefinitionInfo,
	FsReadFileParams,
	FsWriteFileParams,
	FsCreateFileParams,
	FsCreateFolderParams,
	FsDeleteFolderParams,
	FsRenameParams,
	FsRenameResult,
	FsListDirParams,
	FsListDirEntry,
	SaveDocumentImageParams,
	SaveDocumentImageResult,
	DocumentImageInfo,
	DocumentImageChangeEvent,
	ProjectWorkspaceInfo,
	DocumentConfig,
	AppLogEntry,
	AppStartupInfo,
	IpcResult,
	ServiceProvider,
	ThemeMode,
	CustomThemeInfo,
	Theme,
} from '../shared/types';

// ---------------------------------------------------------------------------
// Re-export shared types so renderer code can import them from the preload
// declaration rather than reaching into the shared directory directly.
// ---------------------------------------------------------------------------
export type {
	WorkspaceInfo,
	WorkspaceChangedEvent,
	WorkspaceDeletedEvent,
	IndexingInfo,
	ResourceInfo,
	DocumentFileChangeEvent,
	FileEntry,
	FileEntryChangeEvent,
	TaskSubmitPayload,
	TaskInfo,
	TaskEvent,
	TaskPriority,
	TaskQueueStatus,
	OutputFile,
	OutputFileChangeEvent,
	SaveOutputInput,
	SaveOutputResult,
	OutputUpdateParams,
	DirectoryEntry,
	DirectoryAddManyResult,
	DirectoryValidationResult,
	WritingContextMenuAction,
	WatcherError,
	AgentStreamEvent,
	AgentDefinitionInfo,
	IpcResult,
	FsReadFileParams,
	FsWriteFileParams,
	FsCreateFileParams,
	FsCreateFolderParams,
	FsDeleteFolderParams,
	FsRenameParams,
	FsRenameResult,
	FsListDirParams,
	FsListDirEntry,
	DocumentImageChangeEvent,
	ProjectWorkspaceInfo,
	DocumentConfig,
	ServiceProvider,
	AppLogEntry,
	AppStartupInfo,
	ThemeMode,
	CustomThemeInfo,
	Theme,
};

// ---------------------------------------------------------------------------
// API namespace interfaces
// ---------------------------------------------------------------------------

/** General application utilities — also includes all persisted AI model settings (store) methods. */
export interface AppApi {
	playSound: () => void;
	setTheme: (theme: ThemeMode) => void;
	setLanguage: (language: string) => void;
	showContextMenu: () => void;
	showContextMenuEditable: () => void;
	onLanguageChange: (callback: (lng: string) => void) => () => void;
	onThemeChange: (callback: (theme: ThemeMode) => void) => () => void;
	onFileOpened: (callback: (filePath: string) => void) => () => void;
	popupMenu: () => void;
	getPlatform: () => Promise<string>;
	/** Show the writing-item context menu for the given writing. */
	showWriting: (writingId: string, writingTitle: string) => Promise<void>;
	/** Subscribe to writing context-menu action events. */
	onWritingAction: (callback: (data: WritingContextMenuAction) => void) => () => void;
	// ---------------------------------------------------------------------------
	// Provider management
	// ---------------------------------------------------------------------------
	getProviders: () => Promise<Array<ServiceProvider & { id: string }>>;
	addProvider: (provider: ServiceProvider) => Promise<ServiceProvider & { id: string }>;
	deleteProvider: (id: string) => Promise<void>;
	getStartupInfo: () => Promise<AppStartupInfo>;
	completeFirstRunConfiguration: (providers: ServiceProvider[]) => Promise<AppStartupInfo>;
	/** Fetch the most recent log entries from the main-process ring buffer. `limit` defaults to 200, max 1000. */
	getLogs: (limit?: number) => Promise<AppLogEntry[]>;
	/** Open the application logs folder in the system file explorer. */
	openLogsFolder: () => Promise<void>;
	/** Get all installed custom themes from the themes folder. */
	getCustomThemes: () => Promise<CustomThemeInfo[]>;
	/** Open the themes folder in the system file explorer. */
	openThemesFolder: () => Promise<void>;
	/** Open a folder picker to import a theme; returns the imported theme info, or null if cancelled. */
	importTheme: () => Promise<CustomThemeInfo | null>;
	/** Get the full theme manifest (including light/dark tokens) for a custom theme by its folder ID. */
	getCustomThemeTokens: (id: string) => Promise<Theme | null>;
	/** Delete a custom theme by its folder ID. */
	deleteTheme: (id: string) => Promise<void>;
	/** Open the macOS System Preferences > Accessibility pane. */
	openSystemAccessibility: () => Promise<void>;
	/** Open the macOS System Preferences > Screen Recording pane. */
	openSystemScreenRecording: () => Promise<void>;
	/** Enable or disable the menu bar tray icon. */
	setTrayEnabled: (enabled: boolean) => Promise<void>;
	/** Check whether the menu bar tray icon is currently enabled. */
	getTrayEnabled: () => Promise<boolean>;
}

/** Window controls (minimize / maximize / close / fullscreen) */
export interface WindowApi {
	minimize: () => void;
	maximize: () => void;
	close: () => void;
	isMaximized: () => Promise<boolean>;
	isFullScreen: () => Promise<boolean>;
	onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
	onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void;
}

/** Workspace folder selection, recent workspaces, and document/directory/output management */
export interface WorkspaceApi {
	selectFolder: () => Promise<string | null>;
	getCurrent: () => Promise<string | null>;
	setCurrent: (workspacePath: string) => Promise<void>;
	getRecent: () => Promise<WorkspaceInfo[]>;
	clear: () => Promise<void>;
	directoryExists: (directoryPath: string) => Promise<boolean>;
	removeRecent: (workspacePath: string) => Promise<void>;
	onChange: (callback: (event: WorkspaceChangedEvent) => void) => () => void;
	/** Subscribe to workspace deletion events (folder deleted/moved while app is open) */
	onDeleted: (callback: (event: WorkspaceDeletedEvent) => void) => () => void;
	// -------------------------------------------------------------------------
	// Document import, download, and file-watch events
	// -------------------------------------------------------------------------
	importFiles: (extensions?: string[]) => Promise<ResourceInfo[]>;
	importByPaths: (paths: string[]) => Promise<ResourceInfo[]>;
	downloadFromUrl: (url: string) => Promise<ResourceInfo>;
	loadDocuments: () => Promise<ResourceInfo[]>;
	deleteDocument: (id: string) => Promise<void>;
	onDocumentFileChange: (callback: (event: DocumentFileChangeEvent) => void) => () => void;
	onDocumentWatcherError: (callback: (error: WatcherError) => void) => () => void;
	// -------------------------------------------------------------------------
	// Indexed directory management
	// -------------------------------------------------------------------------
	listDirectories: () => Promise<DirectoryEntry[]>;
	addDirectory: (dirPath: string) => Promise<DirectoryEntry>;
	addDirectories: (dirPaths: string[]) => Promise<DirectoryAddManyResult>;
	removeDirectory: (id: string) => Promise<boolean>;
	validateDirectory: (dirPath: string) => Promise<DirectoryValidationResult>;
	markDirectoryIndexed: (id: string, isIndexed: boolean) => Promise<boolean>;
	onDirectoriesChanged: (callback: (directories: DirectoryEntry[]) => void) => () => void;
	// -------------------------------------------------------------------------
	// Indexing info
	// -------------------------------------------------------------------------
	getIndexingInfo: () => Promise<IndexingInfo | null>;
	// -------------------------------------------------------------------------
	// Shell
	// -------------------------------------------------------------------------
	openDataFolder: () => Promise<void>;
	openResourcesFolder: () => Promise<void>;
	/** Open the folder for a specific document by its ID in the system file explorer. */
	openDocumentFolder: (documentId: string) => Promise<void>;
	/** Open the images sub-folder for a specific document in the system file explorer. */
	openDocumentImagesFolder: (documentId: string) => Promise<void>;
	/** Get the filesystem path of a document's folder given its ID. */
	getDocumentPath: (documentId: string) => Promise<string>;
	/** Save an image file into a document's folder and return the saved file name. */
	saveDocumentImage: (params: SaveDocumentImageParams) => Promise<SaveDocumentImageResult>;
	/** List all image files in a document's images/ folder. */
	listDocumentImages: (documentId: string) => Promise<DocumentImageInfo[]>;
	/** Subscribe to image file changes (add/modify/delete) inside a document's images/ folder. */
	onDocumentImageChange: (callback: (event: DocumentImageChangeEvent) => void) => () => void;
	// -------------------------------------------------------------------------
	// Output file management (documents)
	// -------------------------------------------------------------------------
	saveOutput: (input: SaveOutputInput) => Promise<SaveOutputResult>;
	loadOutputs: () => Promise<OutputFile[]>;
	loadOutputsByType: (type: string) => Promise<OutputFile[]>;
	loadOutput: (params: { type: string; id: string }) => Promise<OutputFile | null>;
	updateOutput: (params: OutputUpdateParams) => Promise<void>;
	deleteOutput: (params: { type: string; id: string }) => Promise<void>;
	trashOutput: (params: { type: string; id: string }) => Promise<void>;
	onOutputFileChange: (callback: (event: OutputFileChangeEvent) => void) => () => void;
	onOutputWatcherError: (callback: (error: WatcherError) => void) => () => void;
	// -------------------------------------------------------------------------
	// Project workspace (project_workspace.openwriter)
	// -------------------------------------------------------------------------
	/** Get the project workspace info, or null if no workspace is set. */
	getProjectInfo: () => Promise<ProjectWorkspaceInfo | null>;
	/** Update the project name. */
	updateProjectName: (name: string) => Promise<ProjectWorkspaceInfo>;
	/** Update the project description. */
	updateProjectDescription: (description: string) => Promise<ProjectWorkspaceInfo>;
	// -------------------------------------------------------------------------
	// Document config
	// -------------------------------------------------------------------------
	/** Get the combined config for a document (metadata + model overrides). */
	getDocumentConfig: (documentId: string) => Promise<DocumentConfig>;
	/** Persist model overrides for a document and broadcast a config-changed event. */
	updateDocumentConfig: (documentId: string, config: Partial<DocumentConfig>) => Promise<void>;
	/** Subscribe to config changes for a specific document. */
	onDocumentConfigChanges: (
		documentId: string,
		callback: (config: DocumentConfig) => void
	) => () => void;
	// -------------------------------------------------------------------------
	// Document content
	// -------------------------------------------------------------------------
	getDocumentContent: (documentId: string) => Promise<string>;
	updateDocumentContent: (documentId: string, content: string) => Promise<void>;
	onDocumentContentChanges: (documentId: string, callback: (content: string) => void) => () => void;
	// -------------------------------------------------------------------------
	// Filesystem
	// -------------------------------------------------------------------------
	/**
	 * Read a text file and return its content as a string.
	 * Files larger than 64 MB are rejected before any buffer is allocated.
	 */
	readFile: (params: FsReadFileParams) => Promise<string>;
	/**
	 * Write (or atomically overwrite) a text file.
	 * By default uses a write-to-temp-then-rename strategy to prevent
	 * half-written files if the process crashes mid-write.
	 */
	writeFile: (params: FsWriteFileParams) => Promise<void>;
	/**
	 * Create a new file, optionally pre-populated with content.
	 * Idempotent by default; pass `failIfExists: true` for exclusive creation.
	 */
	createFile: (params: FsCreateFileParams) => Promise<void>;
	/**
	 * Create a directory, optionally with recursive ancestor creation (mkdir -p).
	 * Idempotent by default; pass `failIfExists: true` for exclusive creation.
	 */
	createFolder: (params: FsCreateFolderParams) => Promise<void>;
	/** Delete a directory within allowed roots. */
	deleteFolder: (params: FsDeleteFolderParams) => Promise<void>;
	/**
	 * Rename or move a file or directory within allowed directories.
	 * Throws by default if the destination already exists.
	 */
	rename: (params: FsRenameParams) => Promise<FsRenameResult>;
	/**
	 * List the immediate children of a directory.
	 * Returns an empty array if the directory does not exist.
	 */
	listDir: (params: FsListDirParams) => Promise<FsListDirEntry[]>;
}

/** Background task queue */
export interface TaskApi {
	submit: (
		type: string,
		input: unknown,
		metadata?: Record<string, unknown>,
		options?: TaskSubmitPayload['options']
	) => Promise<IpcResult<{ taskId: string }>>;
	cancel: (taskId: string) => Promise<IpcResult<boolean>>;
	list: () => Promise<IpcResult<TaskInfo[]>>;
	updatePriority: (
		taskId: string,
		priority: 'low' | 'normal' | 'high'
	) => Promise<IpcResult<boolean>>;
	getResult: (taskId: string) => Promise<IpcResult<TaskInfo | null>>;
	queueStatus: () => Promise<IpcResult<TaskQueueStatus>>;
	onEvent: (callback: (event: TaskEvent) => void) => () => void;
}

// ---------------------------------------------------------------------------
// Global Window augmentation
// ---------------------------------------------------------------------------
// IMPORTANT: This must be inside `declare global` so TypeScript can merge
// it with the built-in Window interface in renderer code.
// ---------------------------------------------------------------------------

declare global {
	interface Window {
		app: AppApi;
		/** Optional: not present in all window types */
		win?: WindowApi;
		workspace: WorkspaceApi;
		task: TaskApi;
	}
}
