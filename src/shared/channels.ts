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
	FsRenameParams,
	FsRenameResult,
	ProjectWorkspaceInfo,
} from './types';
import type { AgentConfig } from './aiSettings';

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
	fsRename: 'fs:rename',
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

export const AppChannels = {
	playSound: 'play-sound',
	setTheme: 'set-theme',
	contextMenu: 'context-menu',
	contextMenuEditable: 'context-menu-editable',
	changeLanguage: 'change-language',
	changeTheme: 'change-theme',
	fileOpened: 'file-opened',
	// Writing context menu (formerly ContextMenuChannels)
	showWritingContextMenu: 'context-menu:writing',
	writingContextMenuAction: 'context-menu:writing-action',
	// Store / API key settings
	getAllApiKeys: 'store-get-all-api-keys',
	getApiKey: 'store-get-api-key',
	setApiKey: 'store-set-api-key',
	// Store / Agent settings
	getAgentSettings: 'store-get-agent-settings',
	getAgentConfig: 'store-get-agent-config',
	setAgentConfig: 'store-set-agent-config',
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
	// ---- App / Store (IpcResult-wrapped) ----
	[AppChannels.getAllApiKeys]: { args: []; result: Record<string, string> };
	[AppChannels.getApiKey]: { args: [providerId: string]; result: string | null };
	[AppChannels.setApiKey]: { args: [providerId: string, apiKey: string]; result: void };
	[AppChannels.getAgentSettings]: { args: []; result: Record<string, AgentConfig> };
	[AppChannels.getAgentConfig]: { args: [agentId: string]; result: AgentConfig | null };
	[AppChannels.setAgentConfig]: { args: [agentId: string, config: AgentConfig]; result: void };

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

	// ---- Resources (IpcResult-wrapped) ----
	[WorkspaceChannels.importFiles]: { args: [extensions?: string[]]; result: ResourceInfo[] };
	[WorkspaceChannels.importByPaths]: { args: [paths: string[]]; result: ResourceInfo[] };
	[WorkspaceChannels.downloadFromUrl]: { args: [url: string]; result: ResourceInfo };
	[WorkspaceChannels.documentsLoadAll]: { args: []; result: ResourceInfo[] };
	[WorkspaceChannels.deleteFile]: { args: [id: string]; result: void };

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
	[WorkspaceChannels.fsRename]: { args: [params: FsRenameParams]; result: FsRenameResult };
}

/**
 * Channels using ipcRenderer.send / ipcMain.on (fire-and-forget).
 * `args` = tuple of arguments after the channel name.
 */
export interface SendChannelMap {
	[AppChannels.playSound]: { args: [] };
	[AppChannels.setTheme]: { args: [theme: string] };
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
	[AppChannels.changeTheme]: { data: string };
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
	[AppChannels.writingContextMenuAction]: { data: WritingContextMenuAction };
}
