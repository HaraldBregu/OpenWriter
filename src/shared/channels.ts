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
	CreateWorkspaceParams,
	IndexingInfo,
	TaskAction,
	TaskInfo,
	TaskEvent,
	AgentTaskSnapshot,
	AgentTaskLookupResult,
	ResourceInfo,
	FolderEntry,
	ImageEntry,
	ImageEntryChangeEvent,
	OutputFile,
	OutputFileChangeEvent,
	SaveOutputInput,
	SaveOutputResult,
	WritingContextMenuAction,
	ContextMenuDescriptor,
	FsReadFileParams,
	FsWriteFileParams,
	FsCreateFolderParams,
	FsDeleteFolderParams,
	FsDeleteFileParams,
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
	ThemeMode,
	CustomThemeInfo,
	CronJobInfo,
	CronTickEvent,
	Theme,
	Provider,
	ProviderModelInfo,
	UserProfile,
	Channel,
	ChannelType,
	TelegramChannelProperties,
	WhatsappChannelProperties,
} from './types';
import type { ShortcutId } from './shortcuts';

// ===========================================================================
// Channel Name Constants (grouped by domain)
// ===========================================================================

export const WorkspaceChannels = {
	// Workspace
	getCurrent: 'workspace-get-current',
	setCurrent: 'workspace-set-current',
	list: 'workspace-list',
	create: 'workspace-create',
	clear: 'workspace-clear',
	changed: 'workspace:changed',
	deleted: 'workspace:deleted',
	// Indexing
	getIndexingInfo: 'indexing:get-info',
	// Shell
	openWorkspaceFolder: 'workspace:open-workspace-folder',
	openDataFolder: 'workspace:open-data-folder',
	openContentsFolder: 'workspace:open-contents-folder',
	openFilesFolder: 'workspace:open-files-folder',
	openImagesFolder: 'workspace:open-images-folder',
	openDocumentFolder: 'workspace:open-document-folder',
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
	outputDelete: 'output:delete',
	outputTrash: 'output:trash',
	outputFileChanged: 'output:file-changed',
	// Filesystem
	fsReadFile: 'fs:read-file',
	fsReadFileBinary: 'fs:read-file-binary',
	fsWriteFile: 'fs:write-file',
	fsCreateFolder: 'fs:create-folder',
	fsDeleteFolder: 'fs:delete-folder',
	fsDeleteFile: 'fs:delete-file',
	fsRename: 'fs:rename',
	fsListDir: 'fs:list-dir',
	// Project workspace
	getProjectInfo: 'project-workspace:get-info',
	updateProjectName: 'project-workspace:update-name',
	updateProjectDescription: 'project-workspace:update-description',
	// Document config + content (merged writer)
	getDocumentConfig: 'workspace:get-document-config',
	documentConfigChanged: 'workspace:document-config-changed',
	getDocumentContent: 'workspace:get-document-content',
	updateDocumentContent: 'workspace:update-document-content',
	updateDocumentConfig: 'workspace:update-document-config',
	// Contents (workspace/contents/)
	getContents: 'contents:get-all',
	getContentsFolders: 'contents:get-folders',
	insertContents: 'contents:insert',
	deleteContent: 'contents:delete',
	// Files (workspace/files/)
	// Images (workspace/images/)
	getImages: 'images:get-all',
	insertImages: 'images:insert',
	deleteImage: 'images:delete',
	imagesChanged: 'images:changed',
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
	getSnapshot: 'task:get-snapshot',
	findForDocument: 'task:find-for-document',
} as const;

export const AssistantChannels = {
	send: 'assistant:send',
	reset: 'assistant:reset',
	response: 'assistant:response',
} as const;

export interface AssistantResponseEvent {
	assistantId: string;
	userMessage: string;
	response: string;
}

export const AppChannels = {
	playSound: 'play-sound',
	setTheme: 'set-theme',
	setLanguage: 'set-language',
	contextMenu: 'context-menu',
	contextMenuEditable: 'context-menu-editable',
	showContextMenu: 'context-menu:show',
	changeLanguage: 'change-language',
	changeTheme: 'change-theme',
	fileOpened: 'file-opened',
	// Writing context menu (formerly ContextMenuChannels)
	showWritingContextMenu: 'context-menu:writing',
	writingContextMenuAction: 'context-menu:writing-action',
	// Store / Provider management
	getProviders: 'app:get-providers',
	addProvider: 'app:add-provider',
	deleteProvider: 'app:delete-provider',
	getAgents: 'app:get-agents',
	updateAgent: 'app:update-agent',
	getStartupInfo: 'app:get-startup-info',
	getProfile: 'app:get-profile',
	setProfile: 'app:set-profile',
	completeFirstRunConfiguration: 'app:complete-first-run-configuration',
	getModels: 'app:get-models',
	// Channels (messaging adapters)
	getChannel: 'app:get-channel',
	setChannelProperties: 'app:set-channel-properties',
	// Logs
	getLogs: 'app:get-logs',
	openLogsFolder: 'app:open-logs-folder',
	// App data folder
	openAppDataFolder: 'app:open-app-data-folder',
	getAppDataFolder: 'app:get-app-data-folder',
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
	// Cron jobs
	cronSchedule: 'app:cron-schedule',
	cronUnschedule: 'app:cron-unschedule',
	cronListJobs: 'app:cron-list-jobs',
	cronHasJob: 'app:cron-has-job',
	cronTick: 'app:cron-tick',
	// Global keyboard shortcuts (main → renderer)
	shortcut: 'app:shortcut',
	// Developer dialogs (main → renderer)
	openTasksDialog: 'app:open-tasks-dialog',
	openLogsDialog: 'app:open-logs-dialog',
	openReduxDialog: 'app:open-redux-dialog',
	openCronDialog: 'app:open-cron-dialog',
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
	[AppChannels.getProviders]: { args: []; result: Provider[] };
	[AppChannels.addProvider]: { args: [provider: Provider]; result: Provider };
	[AppChannels.deleteProvider]: { args: [id: string]; result: void };
	[AppChannels.getAgents]: { args: []; result: AgentSettings[] };
	[AppChannels.updateAgent]: { args: [agent: AgentSettings]; result: AgentSettings };
	[AppChannels.getStartupInfo]: { args: []; result: AppStartupInfo };
	[AppChannels.getProfile]: { args: []; result: UserProfile | null };
	[AppChannels.setProfile]: { args: [profile: UserProfile]; result: UserProfile };
	[AppChannels.completeFirstRunConfiguration]: {
		args: [profile: UserProfile, providers: Provider[]];
		result: AppStartupInfo;
	};
	[AppChannels.getModels]: { args: [providerId: string]; result: ProviderModelInfo[] };
	// ---- Workspace (IpcResult-wrapped) ----
	[WorkspaceChannels.getCurrent]: { args: []; result: string | null };
	[WorkspaceChannels.setCurrent]: { args: [workspacePath: string]; result: void };
	[WorkspaceChannels.list]: { args: []; result: WorkspaceInfo[] };
	[WorkspaceChannels.create]: { args: [params: CreateWorkspaceParams]; result: WorkspaceInfo };
	[WorkspaceChannels.clear]: { args: []; result: void };

	// ---- Window (IpcResult-wrapped for handle, raw for others) ----
	[WindowChannels.isMaximized]: { args: []; result: boolean };
	[WindowChannels.isFullScreen]: { args: []; result: boolean };
	[WindowChannels.getPlatform]: { args: []; result: string };

	// ---- Task (IpcResult-wrapped via registerQuery/registerCommand) ----
	[TaskChannels.submit]: { args: [action: TaskAction]; result: { taskId: string } };
	[TaskChannels.cancel]: { args: [taskId: string]; result: boolean };
	[TaskChannels.list]: { args: []; result: TaskInfo[] };
	[TaskChannels.getSnapshot]: { args: [taskId: string]; result: AgentTaskSnapshot | null };
	[TaskChannels.findForDocument]: {
		args: [documentId: string];
		result: AgentTaskLookupResult | null;
	};

	// ---- Indexing (IpcResult-wrapped) ----
	[WorkspaceChannels.getIndexingInfo]: { args: []; result: IndexingInfo | null };

	// ---- Shell (IpcResult-wrapped) ----
	[WorkspaceChannels.openWorkspaceFolder]: { args: []; result: void };
	[WorkspaceChannels.openDataFolder]: { args: []; result: void };
	[WorkspaceChannels.openContentsFolder]: { args: []; result: void };
	[WorkspaceChannels.openFilesFolder]: { args: []; result: void };
	[WorkspaceChannels.openImagesFolder]: { args: []; result: void };
	[WorkspaceChannels.openDocumentFolder]: { args: [documentId: string]; result: void };
	[WorkspaceChannels.getDocumentPath]: { args: [documentId: string]; result: string };

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
	[WorkspaceChannels.outputDelete]: { args: [params: { type: string; id: string }]; result: void };
	[WorkspaceChannels.outputTrash]: { args: [params: { type: string; id: string }]; result: void };

	// ---- App — writing context menu (raw invoke) ----
	[AppChannels.showWritingContextMenu]: {
		args: [writingId: string, writingTitle: string];
		result: void;
	};

	// ---- App — generic custom context menu (raw invoke) ----
	// Renderer sends an ordered list of descriptors; main pops a native menu
	// and resolves with the clicked item's id, or `null` if dismissed.
	[AppChannels.showContextMenu]: {
		args: [items: ContextMenuDescriptor[]];
		result: string | null;
	};

	// ---- FileSystem (IpcResult-wrapped) ----
	[WorkspaceChannels.fsReadFile]: { args: [params: FsReadFileParams]; result: string };
	[WorkspaceChannels.fsReadFileBinary]: { args: [filePath: string]; result: string };
	[WorkspaceChannels.fsWriteFile]: { args: [params: FsWriteFileParams]; result: void };
	[WorkspaceChannels.fsCreateFolder]: { args: [params: FsCreateFolderParams]; result: void };
	[WorkspaceChannels.fsDeleteFolder]: { args: [params: FsDeleteFolderParams]; result: void };
	[WorkspaceChannels.fsDeleteFile]: { args: [params: FsDeleteFileParams]; result: void };
	[WorkspaceChannels.fsRename]: { args: [params: FsRenameParams]; result: FsRenameResult };
	[WorkspaceChannels.fsListDir]: { args: [params: FsListDirParams]; result: FsListDirEntry[] };

	// ---- Logs (IpcResult-wrapped) ----
	[AppChannels.getLogs]: { args: [limit?: number]; result: AppLogEntry[] };
	[AppChannels.openLogsFolder]: { args: []; result: void };

	// ---- App data folder (IpcResult-wrapped) ----
	[AppChannels.openAppDataFolder]: { args: []; result: void };
	[AppChannels.getAppDataFolder]: { args: []; result: string };

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

	// ---- Cron jobs (IpcResult-wrapped) ----
	[AppChannels.cronSchedule]: {
		args: [params: { id: string; expression: string; timezone?: string; runOnStart?: boolean }];
		result: CronJobInfo;
	};
	[AppChannels.cronUnschedule]: { args: [id: string]; result: void };
	[AppChannels.cronListJobs]: { args: []; result: CronJobInfo[] };
	[AppChannels.cronHasJob]: { args: [id: string]; result: boolean };

	// ---- Project Workspace (IpcResult-wrapped) ----
	[WorkspaceChannels.getProjectInfo]: { args: []; result: ProjectWorkspaceInfo | null };
	[WorkspaceChannels.updateProjectName]: { args: [name: string]; result: ProjectWorkspaceInfo };
	[WorkspaceChannels.updateProjectDescription]: {
		args: [description: string];
		result: ProjectWorkspaceInfo;
	};

	// ---- Document config + content (IpcResult-wrapped) ----
	[WorkspaceChannels.getDocumentConfig]: {
		args: [documentId: string];
		result: DocumentConfig;
	};
	[WorkspaceChannels.getDocumentContent]: {
		args: [documentId: string];
		result: string;
	};
	[WorkspaceChannels.updateDocumentContent]: {
		args: [documentId: string, content: string];
		result: void;
	};
	[WorkspaceChannels.updateDocumentConfig]: {
		args: [documentId: string, config: Partial<DocumentConfig>];
		result: void;
	};

	// ---- Contents: workspace/contents/ (IpcResult-wrapped) ----
	[WorkspaceChannels.getContents]: { args: []; result: ResourceInfo[] };
	[WorkspaceChannels.getContentsFolders]: { args: []; result: FolderEntry[] };
	[WorkspaceChannels.insertContents]: { args: [extensions?: string[]]; result: ResourceInfo[] };
	[WorkspaceChannels.deleteContent]: { args: [id: string]; result: void };

	// ---- Files: workspace/files/ (IpcResult-wrapped) ----

	// ---- Images: workspace/images/ (IpcResult-wrapped) ----
	[WorkspaceChannels.getImages]: { args: []; result: ImageEntry[] };
	[WorkspaceChannels.insertImages]: { args: [extensions?: string[]]; result: ImageEntry[] };
	[WorkspaceChannels.deleteImage]: { args: [id: string]; result: void };

	// ---- Assistant (IpcResult-wrapped) ----
	[AssistantChannels.send]: { args: [message: string, assistantId?: string]; result: string };
	[AssistantChannels.reset]: { args: [assistantId?: string]; result: void };
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
	[WorkspaceChannels.outputFileChanged]: { data: OutputFileChangeEvent };
	[WorkspaceChannels.documentImageChanged]: { data: DocumentImageChangeEvent };
	[WorkspaceChannels.documentConfigChanged]: {
		data: { documentId: string; config: DocumentConfig };
	};
	[AppChannels.writingContextMenuAction]: { data: WritingContextMenuAction };
	[AppChannels.shortcut]: { data: ShortcutId };
	[AppChannels.cronTick]: { data: CronTickEvent };
	[AppChannels.openTasksDialog]: { data: undefined };
	[AppChannels.openLogsDialog]: { data: undefined };
	[AppChannels.openReduxDialog]: { data: undefined };
	[AppChannels.openCronDialog]: { data: undefined };
	// ---- Images watcher events ----
	[WorkspaceChannels.imagesChanged]: { data: ImageEntryChangeEvent };
	[AssistantChannels.response]: { data: AssistantResponseEvent };
}
