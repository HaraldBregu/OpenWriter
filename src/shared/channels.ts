// ---------------------------------------------------------------------------
// Shared IPC Channel Constants & Type Maps
// ---------------------------------------------------------------------------
// Single source of truth for all IPC channel names and their type signatures.
// Used by main, preload, and renderer.
//
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

import type {
	WorkspaceInfo,
	WorkspaceChangedEvent,
	WorkspaceDeletedEvent,
	IndexingInfo,
	TaskSubmitPayload,
	TaskInfo,
	TaskEvent,
	TaskQueueStatus,
	TaskPriority,
	ResourceInfo,
	DocumentFileChangeEvent,
	FileEntry,
	FileEntryChangeEvent,
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
	ThemeMode,
	CustomThemeInfo,
	Theme,
} from './types';
import type { ServiceProvider } from './types';

// ===========================================================================
// Channel Name Constants (grouped by domain)
// ===========================================================================

export const WorkspaceChannels = {
	// Workspace
	selectFolder: 'workspace:select-folder',
	getCurrent: 'workspace-get-current',
	setCurrent: 'workspace-set-current',
	getRecent: 'workspace-get-recent',
	clear: 'workspace-clear',
	directoryExists: 'workspace-directory-exists',
	removeRecent: 'workspace-remove-recent',
	changed: 'workspace:changed',
	deleted: 'workspace:deleted',
	// Resources
	importFiles: 'resources:import-files',
	importByPaths: 'resources:import-by-paths',
	downloadFromUrl: 'resources:download-from-url',
	documentsLoadAll: 'resources:load-all',
	deleteFile: 'resources:delete-file',
	documentsFileChanged: 'resources:file-changed',
	documentsWatcherError: 'resources:watcher-error',
	// Directories
	list: 'directories:list',
	add: 'directories:add',
	addMany: 'directories:add-many',
	remove: 'directories:remove',
	validate: 'directories:validate',
	markIndexed: 'directories:mark-indexed',
	directoriesChanged: 'directories:changed',
	// Indexing
	getIndexingInfo: 'indexing:get-info',
	// Shell
	openDataFolder: 'workspace:open-data-folder',
	openResourcesFolder: 'workspace:open-resources-folder',
	openDocumentFolder: 'workspace:open-document-folder',
	openDocumentImagesFolder: 'workspace:open-document-images-folder',
	getDocumentPath: 'workspace:get-document-path',
	// Document images
	saveDocumentImage: 'output:save-document-image',
	listDocumentImages: 'output:list-document-images',
	documentImageChanged: 'output:document-image-changed',
	// Output
	outputSave: 'output:save',
	outputLoadAll: 'output:load-all',
	loadByType: 'output:load-by-type',
	outputLoadOne: 'output:load-one',
	update: 'output:update',
	outputDelete: 'output:delete',
	outputTrash: 'output:trash',
	outputFileChanged: 'output:file-changed',
	outputWatcherError: 'output:watcher-error',
	// Filesystem
	fsReadFile: 'fs:read-file',
	fsWriteFile: 'fs:write-file',
	fsCreateFile: 'fs:create-file',
	fsCreateFolder: 'fs:create-folder',
	fsDeleteFolder: 'fs:delete-folder',
	fsRename: 'fs:rename',
	fsListDir: 'fs:list-dir',
	// Project workspace
	getProjectInfo: 'project-workspace:get-info',
	updateProjectName: 'project-workspace:update-name',
	updateProjectDescription: 'project-workspace:update-description',
	// Document config
	getDocumentConfig: 'workspace:get-document-config',
	updateDocumentConfig: 'workspace:update-document-config',
	documentConfigChanged: 'workspace:document-config-changed',
	// Document content
	getDocumentContent: 'workspace:get-document-content',
	updateDocumentContent: 'workspace:update-document-content',
	documentContentChanged: 'workspace:document-content-changed',
	// Files (resources/files/ sub-folder)
	getFiles: 'files:get-all',
	insertFiles: 'files:insert',
	deleteFileEntry: 'files:delete',
	filesChanged: 'files:changed',
	filesWatcherError: 'files:watcher-error',
} as const;

export const WindowChannels = {
	minimize: 'window:minimize',
	maximize: 'window:maximize',
	close: 'window:close',
	isMaximized: 'window:is-maximized',
	isFullScreen: 'window:is-fullscreen',
	maximizeChange: 'window:maximize-change',
	fullScreenChange: 'window:fullscreen-change',
	getPlatform: 'window:get-platform',
	popupMenu: 'window:popup-menu',
} as const;

export const TaskChannels = {
	submit: 'task:submit',
	cancel: 'task:cancel',
	list: 'task:list',
	event: 'task:event',
	updatePriority: 'task:update-priority',
	getResult: 'task:get-result',
	queueStatus: 'task:queue-status',
} as const;

export const LogChannels = {
	getLogs: 'log:get-logs',
} as const;

export const AppChannels = {
	playSound: 'play-sound',
	setTheme: 'set-theme',
	setLanguage: 'set-language',
	contextMenu: 'context-menu',
	contextMenuEditable: 'context-menu-editable',
	changeLanguage: 'change-language',
	changeTheme: 'change-theme',
	fileOpened: 'file-opened',
	// Writing context menu (formerly ContextMenuChannels)
	showWritingContextMenu: 'context-menu:writing',
	writingContextMenuAction: 'context-menu:writing-action',
	// Store / Provider management
	getProviders: 'store-get-providers',
	addProvider: 'store-add-provider',
	deleteProvider: 'store-delete-provider',
	getStartupInfo: 'app:get-startup-info',
	completeFirstRunConfiguration: 'app:complete-first-run-configuration',
	// Logs
	openLogsFolder: 'app:open-logs-folder',
	// Theme management
	getCustomThemes: 'app:get-custom-themes',
	openThemesFolder: 'app:open-themes-folder',
	importTheme: 'app:import-theme',
	getCustomThemeTokens: 'app:get-custom-theme-tokens',
	deleteTheme: 'app:delete-theme',
	// System settings
	openSystemAccessibility: 'app:open-system-accessibility',
	openSystemScreenRecording: 'app:open-system-screen-recording',
	// Tray
	setTrayEnabled: 'app:set-tray-enabled',
	getTrayEnabled: 'app:get-tray-enabled',
} as const;

// ===========================================================================
// Channel-to-Type Maps
// ===========================================================================
// These map each channel to its args (tuple) and result type.
// `result` represents the LOGICAL return type (T, not IpcResult<T>).
// The IpcResult wrapping is an implementation detail of the transport layer.

/**
 * Channels using ipcRenderer.invoke / ipcMain.handle.
 * `args` = tuple of arguments after the channel name.
 * `result` = the logical return type.
 */
export interface InvokeChannelMap {
	// ---- App / Provider management (IpcResult-wrapped) ----
	[AppChannels.getProviders]: { args: []; result: Array<ServiceProvider & { id: string }> };
	[AppChannels.addProvider]: {
		args: [provider: ServiceProvider];
		result: ServiceProvider & { id: string };
	};
	[AppChannels.deleteProvider]: { args: [id: string]; result: void };
	[AppChannels.getStartupInfo]: { args: []; result: AppStartupInfo };
	[AppChannels.completeFirstRunConfiguration]: {
		args: [providers: ServiceProvider[]];
		result: AppStartupInfo;
	};
	// ---- Workspace (IpcResult-wrapped) ----
	[WorkspaceChannels.selectFolder]: { args: []; result: string | null };
	[WorkspaceChannels.getCurrent]: { args: []; result: string | null };
	[WorkspaceChannels.setCurrent]: { args: [workspacePath: string]; result: void };
	[WorkspaceChannels.getRecent]: { args: []; result: WorkspaceInfo[] };
	[WorkspaceChannels.clear]: { args: []; result: void };
	[WorkspaceChannels.directoryExists]: { args: [directoryPath: string]; result: boolean };
	[WorkspaceChannels.removeRecent]: { args: [workspacePath: string]; result: void };

	// ---- Window (IpcResult-wrapped for handle, raw for others) ----
	[WindowChannels.isMaximized]: { args: []; result: boolean };
	[WindowChannels.isFullScreen]: { args: []; result: boolean };
	[WindowChannels.getPlatform]: { args: []; result: string };

	// ---- Task (IpcResult-wrapped via registerQuery/registerCommand) ----
	[TaskChannels.submit]: { args: [payload: TaskSubmitPayload]; result: { taskId: string } };
	[TaskChannels.cancel]: { args: [taskId: string]; result: boolean };
	[TaskChannels.list]: { args: []; result: TaskInfo[] };
	[TaskChannels.updatePriority]: {
		args: [taskId: string, priority: TaskPriority];
		result: boolean;
	};
	[TaskChannels.getResult]: { args: [taskId: string]; result: TaskInfo | null };
	[TaskChannels.queueStatus]: { args: []; result: TaskQueueStatus };

	// ---- Indexing (IpcResult-wrapped) ----
	[WorkspaceChannels.getIndexingInfo]: { args: []; result: IndexingInfo | null };

	// ---- Shell (IpcResult-wrapped) ----
	[WorkspaceChannels.openDataFolder]: { args: []; result: void };
	[WorkspaceChannels.openResourcesFolder]: { args: []; result: void };
	[WorkspaceChannels.openDocumentFolder]: { args: [documentId: string]; result: void };
	[WorkspaceChannels.openDocumentImagesFolder]: { args: [documentId: string]; result: void };
	[WorkspaceChannels.getDocumentPath]: { args: [documentId: string]; result: string };

	// ---- Resources (IpcResult-wrapped) ----
	[WorkspaceChannels.importFiles]: { args: [extensions?: string[]]; result: ResourceInfo[] };
	[WorkspaceChannels.importByPaths]: { args: [paths: string[]]; result: ResourceInfo[] };
	[WorkspaceChannels.downloadFromUrl]: { args: [url: string]; result: ResourceInfo };
	[WorkspaceChannels.documentsLoadAll]: { args: []; result: ResourceInfo[] };
	[WorkspaceChannels.deleteFile]: { args: [id: string]; result: void };

	// ---- Document images (IpcResult-wrapped) ----
	[WorkspaceChannels.saveDocumentImage]: {
		args: [params: SaveDocumentImageParams];
		result: SaveDocumentImageResult;
	};
	[WorkspaceChannels.listDocumentImages]: {
		args: [documentId: string];
		result: DocumentImageInfo[];
	};

	// ---- Output (IpcResult-wrapped) ----
	[WorkspaceChannels.outputSave]: { args: [input: SaveOutputInput]; result: SaveOutputResult };
	[WorkspaceChannels.outputLoadAll]: { args: []; result: OutputFile[] };
	[WorkspaceChannels.loadByType]: { args: [type: string]; result: OutputFile[] };
	[WorkspaceChannels.outputLoadOne]: {
		args: [params: { type: string; id: string }];
		result: OutputFile | null;
	};
	[WorkspaceChannels.update]: { args: [params: OutputUpdateParams]; result: void };
	[WorkspaceChannels.outputDelete]: { args: [params: { type: string; id: string }]; result: void };
	[WorkspaceChannels.outputTrash]: { args: [params: { type: string; id: string }]; result: void };

	// ---- Directories (IpcResult-wrapped) ----
	[WorkspaceChannels.list]: { args: []; result: DirectoryEntry[] };
	[WorkspaceChannels.add]: { args: [dirPath: string]; result: DirectoryEntry };
	[WorkspaceChannels.addMany]: { args: [dirPaths: string[]]; result: DirectoryAddManyResult };
	[WorkspaceChannels.remove]: { args: [id: string]; result: boolean };
	[WorkspaceChannels.validate]: { args: [dirPath: string]; result: DirectoryValidationResult };
	[WorkspaceChannels.markIndexed]: { args: [id: string, isIndexed: boolean]; result: boolean };

	// ---- App — writing context menu (raw invoke) ----
	[AppChannels.showWritingContextMenu]: {
		args: [writingId: string, writingTitle: string];
		result: void;
	};

	// ---- FileSystem (IpcResult-wrapped) ----
	[WorkspaceChannels.fsReadFile]: { args: [params: FsReadFileParams]; result: string };
	[WorkspaceChannels.fsWriteFile]: { args: [params: FsWriteFileParams]; result: void };
	[WorkspaceChannels.fsCreateFile]: { args: [params: FsCreateFileParams]; result: void };
	[WorkspaceChannels.fsCreateFolder]: { args: [params: FsCreateFolderParams]; result: void };
	[WorkspaceChannels.fsDeleteFolder]: { args: [params: FsDeleteFolderParams]; result: void };
	[WorkspaceChannels.fsRename]: { args: [params: FsRenameParams]; result: FsRenameResult };
	[WorkspaceChannels.fsListDir]: { args: [params: FsListDirParams]; result: FsListDirEntry[] };

	// ---- Logs (IpcResult-wrapped) ----
	[LogChannels.getLogs]: { args: [limit?: number]; result: AppLogEntry[] };
	[AppChannels.openLogsFolder]: { args: []; result: void };

	// ---- Theme management (IpcResult-wrapped) ----
	[AppChannels.getCustomThemes]: { args: []; result: CustomThemeInfo[] };
	[AppChannels.openThemesFolder]: { args: []; result: void };
	[AppChannels.importTheme]: { args: []; result: CustomThemeInfo | null };
	[AppChannels.getCustomThemeTokens]: { args: [id: string]; result: Theme | null };
	[AppChannels.deleteTheme]: { args: [id: string]; result: void };

	// ---- System settings (IpcResult-wrapped) ----
	[AppChannels.openSystemAccessibility]: { args: []; result: void };
	[AppChannels.openSystemScreenRecording]: { args: []; result: void };

	// ---- Tray (IpcResult-wrapped) ----
	[AppChannels.setTrayEnabled]: { args: [enabled: boolean]; result: void };
	[AppChannels.getTrayEnabled]: { args: []; result: boolean };

	// ---- Project Workspace (IpcResult-wrapped) ----
	[WorkspaceChannels.getProjectInfo]: { args: []; result: ProjectWorkspaceInfo | null };
	[WorkspaceChannels.updateProjectName]: { args: [name: string]; result: ProjectWorkspaceInfo };
	[WorkspaceChannels.updateProjectDescription]: {
		args: [description: string];
		result: ProjectWorkspaceInfo;
	};

	// ---- Document config (IpcResult-wrapped) ----
	[WorkspaceChannels.getDocumentConfig]: {
		args: [documentId: string];
		result: DocumentConfig;
	};
	[WorkspaceChannels.updateDocumentConfig]: {
		args: [documentId: string, config: Partial<DocumentConfig>];
		result: void;
	};

	// ---- Document content (IpcResult-wrapped) ----
	[WorkspaceChannels.getDocumentContent]: {
		args: [documentId: string];
		result: string;
	};
	[WorkspaceChannels.updateDocumentContent]: {
		args: [documentId: string, content: string];
		result: void;
	};
}

/**
 * Channels using ipcRenderer.send / ipcMain.on (fire-and-forget).
 * `args` = tuple of arguments after the channel name.
 */
export interface SendChannelMap {
	[AppChannels.playSound]: { args: [] };
	[AppChannels.setTheme]: { args: [theme: ThemeMode] };
	[AppChannels.setLanguage]: { args: [language: string] };
	[AppChannels.contextMenu]: { args: [] };
	[AppChannels.contextMenuEditable]: { args: [] };
	[WindowChannels.minimize]: { args: [] };
	[WindowChannels.maximize]: { args: [] };
	[WindowChannels.close]: { args: [] };
	[WindowChannels.popupMenu]: { args: [] };
}

/**
 * Channels for events pushed from main → renderer via webContents.send.
 * `data` = the payload sent with the event.
 */
export interface EventChannelMap {
	[AppChannels.changeLanguage]: { data: string };
	[AppChannels.changeTheme]: { data: ThemeMode };
	[AppChannels.fileOpened]: { data: string };
	[WindowChannels.maximizeChange]: { data: boolean };
	[WindowChannels.fullScreenChange]: { data: boolean };
	[WorkspaceChannels.changed]: { data: WorkspaceChangedEvent };
	[WorkspaceChannels.deleted]: { data: WorkspaceDeletedEvent };
	[TaskChannels.event]: { data: TaskEvent };
	[WorkspaceChannels.documentsFileChanged]: { data: DocumentFileChangeEvent };
	[WorkspaceChannels.documentsWatcherError]: { data: WatcherError };
	[WorkspaceChannels.outputFileChanged]: { data: OutputFileChangeEvent };
	[WorkspaceChannels.outputWatcherError]: { data: WatcherError };
	[WorkspaceChannels.directoriesChanged]: { data: DirectoryEntry[] };
	[WorkspaceChannels.documentImageChanged]: { data: DocumentImageChangeEvent };
	[WorkspaceChannels.documentConfigChanged]: {
		data: { documentId: string; config: DocumentConfig };
	};
	[WorkspaceChannels.documentContentChanged]: {
		data: { documentId: string; content: string };
	};
	[AppChannels.writingContextMenuAction]: { data: WritingContextMenuAction };
}
