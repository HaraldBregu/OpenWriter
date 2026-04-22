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
	ContentEntryChangeEvent,
	DocumentFileChangeEvent,
	FileEntry,
	FileEntryChangeEvent,
	FolderEntry,
	ImageEntry,
	ImageEntryChangeEvent,
	TaskAction,
	TaskActionReturn,
	TaskInfo,
	TaskEvent,
	TaskPriority,
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
	AgentSettings,
	IpcResult,
	Service,
	ThemeMode,
	CustomThemeInfo,
	Theme,
	SkillInfo,
	ExtensionCommandExecutionResult,
	ExtensionCommandInfo,
	ExtensionDocPanelContent,
	ExtensionDocPanelContentChangedPayload,
	ExtensionDocPanelInfo,
	ExtensionDocPanelsChangedPayload,
	ExtensionRegistrySnapshot,
	ExtensionRuntimeChangedPayload,
	ExtensionRuntimeInfo,
	ExtensionRuntimeState,
} from '../shared/types';
import type { ShortcutId } from '../shared/shortcuts';

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
	ContentEntryChangeEvent,
	DocumentFileChangeEvent,
	FileEntry,
	FileEntryChangeEvent,
	FolderEntry,
	ImageEntry,
	ImageEntryChangeEvent,
	TaskAction,
	TaskActionReturn,
	TaskInfo,
	TaskEvent,
	TaskPriority,
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
	Service,
	AppLogEntry,
	AppStartupInfo,
	AgentSettings,
	ThemeMode,
	CustomThemeInfo,
	Theme,
	SkillInfo,
	ExtensionCommandExecutionResult,
	ExtensionCommandInfo,
	ExtensionDocPanelContent,
	ExtensionDocPanelContentChangedPayload,
	ExtensionDocPanelInfo,
	ExtensionDocPanelsChangedPayload,
	ExtensionRegistrySnapshot,
	ExtensionRuntimeChangedPayload,
	ExtensionRuntimeInfo,
	ExtensionRuntimeState,
};
export type { ShortcutId } from '../shared/shortcuts';

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
	// Service management
	// ---------------------------------------------------------------------------
	getServices: () => Promise<Array<Service & { id: string }>>;
	addService: (service: Service) => Promise<Service & { id: string }>;
	deleteService: (id: string) => Promise<void>;
	getAgents: () => Promise<AgentSettings[]>;
	updateAgent: (agent: AgentSettings) => Promise<AgentSettings>;
	getStartupInfo: () => Promise<AppStartupInfo>;
	completeFirstRunConfiguration: (services: Service[]) => Promise<AppStartupInfo>;
	/** Fetch the most recent log entries from the main-process ring buffer. `limit` defaults to 200, max 1000. */
	getLogs: (limit?: number) => Promise<AppLogEntry[]>;
	/** Open the application logs folder in the system file explorer. */
	openLogsFolder: () => Promise<void>;
	/** Open the application user-data folder in the system file explorer. */
	openAppDataFolder: () => Promise<void>;
	/** Get the absolute path of the application user-data folder. */
	getAppDataFolder: () => Promise<string>;
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
	/** Get all bundled + user-installed skills. */
	getSkills: () => Promise<SkillInfo[]>;
	/** Open the user skills folder in the system file explorer. */
	openSkillsFolder: () => Promise<void>;
	/** Open a folder picker to import one-or-many skills; returns the imported skill entries (empty if cancelled). */
	importSkill: () => Promise<SkillInfo[]>;
	/** Delete a user-installed skill by its folder ID. */
	deleteSkill: (id: string) => Promise<void>;
	/** Open the macOS System Preferences > Accessibility pane. */
	openSystemAccessibility: () => Promise<void>;
	/** Open the macOS System Preferences > Screen Recording pane. */
	openSystemScreenRecording: () => Promise<void>;
	/** Enable or disable the menu bar tray icon. */
	setTrayEnabled: (enabled: boolean) => Promise<void>;
	/** Check whether the menu bar tray icon is currently enabled. */
	getTrayEnabled: () => Promise<boolean>;
	/** Resolve the absolute filesystem path for a File from a native drag/drop or <input type="file">. */
	getPathForFile: (file: File) => string;
	/** Subscribe to app-level keyboard shortcut events emitted from the main process. */
	onShortcut: (callback: (id: ShortcutId) => void) => () => void;
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

export interface ExtensionsApi {
	list: () => Promise<ExtensionRuntimeInfo[]>;
	getState: (extensionId: string) => Promise<ExtensionRuntimeState>;
	getCommands: () => Promise<ExtensionCommandInfo[]>;
	getDocPanels: (documentId: string) => Promise<ExtensionDocPanelInfo[]>;
	getDocPanelContent: (panelId: string, documentId: string) => Promise<ExtensionDocPanelContent>;
	refreshDocPanel: (panelId: string, documentId: string) => Promise<ExtensionDocPanelContent>;
	executeCommand: (
		commandId: string,
		payload?: unknown
	) => Promise<ExtensionCommandExecutionResult>;
	executeDocPanelAction: (
		commandId: string,
		payload?: unknown
	) => Promise<ExtensionCommandExecutionResult>;
	setEnabled: (extensionId: string, enabled: boolean) => Promise<void>;
	reload: (extensionId: string) => Promise<void>;
	setActiveDocument: (documentId: string | null) => Promise<void>;
	openFolder: () => Promise<void>;
	onRegistryChanged: (callback: (payload: ExtensionRegistrySnapshot) => void) => () => void;
	onRuntimeChanged: (callback: (payload: ExtensionRuntimeChangedPayload) => void) => () => void;
	onDocPanelsChanged: (callback: (payload: ExtensionDocPanelsChangedPayload) => void) => () => void;
	onDocPanelContentChanged: (
		callback: (payload: ExtensionDocPanelContentChangedPayload) => void
	) => () => void;
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
	// Deprecated resources API — main-side removed, renderer surface kept.
	// Every call rejects at runtime; listeners are no-ops returning unsubscribe.
	// -------------------------------------------------------------------------
	importFiles: (extensions?: string[]) => Promise<ResourceInfo[]>;
	loadDocuments: () => Promise<ResourceInfo[]>;
	deleteDocument: (id: string) => Promise<void>;
	onDocumentFileChange: (callback: (event: DocumentFileChangeEvent) => void) => () => void;
	// -------------------------------------------------------------------------
	// Indexing info
	// -------------------------------------------------------------------------
	getIndexingInfo: () => Promise<IndexingInfo | null>;
	// -------------------------------------------------------------------------
	// Shell
	// -------------------------------------------------------------------------
	/** Open the current workspace root folder in the system file explorer. */
	openWorkspaceFolder: () => Promise<void>;
	openDataFolder: () => Promise<void>;
	openContentsFolder: () => Promise<void>;
	openFilesFolder: () => Promise<void>;
	/** Open the folder for a specific document by its ID in the system file explorer. */
	openDocumentFolder: (documentId: string) => Promise<void>;
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
	deleteOutput: (params: { type: string; id: string }) => Promise<void>;
	trashOutput: (params: { type: string; id: string }) => Promise<void>;
	onOutputFileChange: (callback: (event: OutputFileChangeEvent) => void) => () => void;
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
	// OCR model preference
	// -------------------------------------------------------------------------
	/** Get the workspace's default OCR model ID. Falls back to DEFAULT_OCR_MODEL_ID. */
	getOcrModelId: () => Promise<string>;
	/** Set the workspace's default OCR model ID. */
	setOcrModelId: (modelId: string) => Promise<void>;
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
	// -------------------------------------------------------------------------
	// Contents (workspace/contents/)
	// -------------------------------------------------------------------------
	/** Load all files from the workspace contents/ directory. */
	getContents: () => Promise<ResourceInfo[]>;
	/** Load all sub-folders from the workspace contents/ directory. */
	getContentsFolders: () => Promise<FolderEntry[]>;
	/** Open a file picker, copy selected files into contents/, return the new entries. */
	insertContents: (extensions?: string[]) => Promise<ResourceInfo[]>;
	/** Delete a file from contents/ by its ID. */
	deleteContent: (id: string) => Promise<void>;
	// -------------------------------------------------------------------------
	// Files (workspace/files/)
	// -------------------------------------------------------------------------
	/** Load all files from the workspace files/ directory. */
	getFiles: () => Promise<FileEntry[]>;
	/** Open a file picker, copy selected files into files/, return the new entries. */
	insertFiles: (extensions?: string[]) => Promise<FileEntry[]>;
	/** Delete a file from files/ by its ID. */
	deleteFileEntry: (id: string) => Promise<void>;
	/** Subscribe to file change events in files/. */
	onFilesChanged: (callback: (event: FileEntryChangeEvent) => void) => () => void;
	// -------------------------------------------------------------------------
	// Images (workspace/images/)
	// -------------------------------------------------------------------------
	/** Load all images from the workspace images/ directory. */
	getImages: () => Promise<ImageEntry[]>;
	/** Subscribe to image change events in images/. */
	onImagesChanged: (callback: (event: ImageEntryChangeEvent) => void) => () => void;
	// -------------------------------------------------------------------------
	// Filesystem
	// -------------------------------------------------------------------------
	/**
	 * Read a text file and return its content as a string.
	 * Files larger than 64 MB are rejected before any buffer is allocated.
	 */
	readFile: (params: FsReadFileParams) => Promise<string>;
	/** Read a binary file and return its content as a base64-encoded string. */
	readFileBinary: (filePath: string) => Promise<string>;
	/**
	 * Write (or atomically overwrite) a text file.
	 * By default uses a write-to-temp-then-rename strategy to prevent
	 * half-written files if the process crashes mid-write.
	 */
	writeFile: (params: FsWriteFileParams) => Promise<void>;
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
	submit: (action: TaskAction) => Promise<IpcResult<TaskActionReturn>>;
	cancel: (taskId: string) => Promise<IpcResult<boolean>>;
	list: () => Promise<IpcResult<TaskInfo[]>>;
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
		extensions: ExtensionsApi;
	}
}
