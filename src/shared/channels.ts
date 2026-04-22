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
	TaskAction,
	TaskInfo,
	TaskEvent,
	ResourceInfo,
	FileEntry,
	FileEntryChangeEvent,
	FolderEntry,
	ImageEntry,
	ImageEntryChangeEvent,
	OutputFile,
	OutputFileChangeEvent,
	SaveOutputInput,
	SaveOutputResult,
	WritingContextMenuAction,
	FsReadFileParams,
	FsWriteFileParams,
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
	ThemeMode,
	CustomThemeInfo,
	SkillInfo,
	Theme,
	Service,
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
} from './types';
import type { ShortcutId } from './shortcuts';

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
	// Indexing
	getIndexingInfo: 'indexing:get-info',
	// Shell
	openWorkspaceFolder: 'workspace:open-workspace-folder',
	openDataFolder: 'workspace:open-data-folder',
	openContentsFolder: 'workspace:open-contents-folder',
	openFilesFolder: 'workspace:open-files-folder',
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
	// Contents (workspace/contents/)
	getContents: 'contents:get-all',
	getContentsFolders: 'contents:get-folders',
	insertContents: 'contents:insert',
	deleteContent: 'contents:delete',
	// OCR model preference
	getOcrModelId: 'workspace:get-ocr-model-id',
	setOcrModelId: 'workspace:set-ocr-model-id',
	// Files (workspace/files/)
	getFiles: 'files:get-all',
	insertFiles: 'files:insert',
	deleteFileEntry: 'files:delete',
	filesChanged: 'files:changed',
	// Images (workspace/images/)
	getImages: 'images:get-all',
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
	// Store / Service management
	getServices: 'app:get-services',
	addService: 'app:add-service',
	deleteService: 'app:delete-service',
	getAgents: 'app:get-agents',
	updateAgent: 'app:update-agent',
	getStartupInfo: 'app:get-startup-info',
	completeFirstRunConfiguration: 'app:complete-first-run-configuration',
	// Logs
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
	// Skills management
	getSkills: 'app:get-skills',
	openSkillsFolder: 'app:open-skills-folder',
	importSkill: 'app:import-skill',
	deleteSkill: 'app:delete-skill',
	// System settings
	openSystemAccessibility: 'app:open-system-accessibility',
	openSystemScreenRecording: 'app:open-system-screen-recording',
	// Tray
	setTrayEnabled: 'app:set-tray-enabled',
	getTrayEnabled: 'app:get-tray-enabled',
	// Global keyboard shortcuts (main → renderer)
	shortcut: 'app:shortcut',
	// Developer dialogs (main → renderer)
	openTasksDialog: 'app:open-tasks-dialog',
	openLogsDialog: 'app:open-logs-dialog',
	openReduxDialog: 'app:open-redux-dialog',
} as const;

export const ExtensionChannels = {
	list: 'extensions:list',
	getState: 'extensions:get-state',
	getCommands: 'extensions:get-commands',
	executeCommand: 'extensions:execute-command',
	getDocPanels: 'extensions:get-doc-panels',
	getDocPanelContent: 'extensions:get-doc-panel-content',
	refreshDocPanel: 'extensions:refresh-doc-panel',
	setEnabled: 'extensions:set-enabled',
	reload: 'extensions:reload',
	setActiveDocument: 'extensions:set-active-document',
	openFolder: 'extensions:open-folder',
	registryChanged: 'extensions:registry-changed',
	runtimeChanged: 'extensions:runtime-changed',
	docPanelsChanged: 'extensions:doc-panels-changed',
	docPanelContentChanged: 'extensions:doc-panel-content-changed',
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
	// ---- App / Service management (IpcResult-wrapped) ----
	[AppChannels.getServices]: { args: []; result: Array<Service & { id: string }> };
	[AppChannels.addService]: {
		args: [service: Service];
		result: Service & { id: string };
	};
	[AppChannels.deleteService]: { args: [id: string]; result: void };
	[AppChannels.getAgents]: { args: []; result: AgentSettings[] };
	[AppChannels.updateAgent]: { args: [agent: AgentSettings]; result: AgentSettings };
	[AppChannels.getStartupInfo]: { args: []; result: AppStartupInfo };
	[AppChannels.completeFirstRunConfiguration]: {
		args: [services: Service[]];
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
	[TaskChannels.submit]: { args: [action: TaskAction]; result: { taskId: string } };
	[TaskChannels.cancel]: { args: [taskId: string]; result: boolean };
	[TaskChannels.list]: { args: []; result: TaskInfo[] };

	// ---- Indexing (IpcResult-wrapped) ----
	[WorkspaceChannels.getIndexingInfo]: { args: []; result: IndexingInfo | null };

	// ---- Shell (IpcResult-wrapped) ----
	[WorkspaceChannels.openWorkspaceFolder]: { args: []; result: void };
	[WorkspaceChannels.openDataFolder]: { args: []; result: void };
	[WorkspaceChannels.openContentsFolder]: { args: []; result: void };
	[WorkspaceChannels.openFilesFolder]: { args: []; result: void };
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

	// ---- FileSystem (IpcResult-wrapped) ----
	[WorkspaceChannels.fsReadFile]: { args: [params: FsReadFileParams]; result: string };
	[WorkspaceChannels.fsReadFileBinary]: { args: [filePath: string]; result: string };
	[WorkspaceChannels.fsWriteFile]: { args: [params: FsWriteFileParams]; result: void };
	[WorkspaceChannels.fsCreateFolder]: { args: [params: FsCreateFolderParams]; result: void };
	[WorkspaceChannels.fsDeleteFolder]: { args: [params: FsDeleteFolderParams]; result: void };
	[WorkspaceChannels.fsRename]: { args: [params: FsRenameParams]; result: FsRenameResult };
	[WorkspaceChannels.fsListDir]: { args: [params: FsListDirParams]; result: FsListDirEntry[] };

	// ---- Logs (IpcResult-wrapped) ----
	[LogChannels.getLogs]: { args: [limit?: number]; result: AppLogEntry[] };
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

	// ---- Skills management (IpcResult-wrapped) ----
	[AppChannels.getSkills]: { args: []; result: SkillInfo[] };
	[AppChannels.openSkillsFolder]: { args: []; result: void };
	[AppChannels.importSkill]: { args: []; result: SkillInfo[] };
	[AppChannels.deleteSkill]: { args: [id: string]; result: void };

	// ---- System settings (IpcResult-wrapped) ----
	[AppChannels.openSystemAccessibility]: { args: []; result: void };
	[AppChannels.openSystemScreenRecording]: { args: []; result: void };

	// ---- Tray (IpcResult-wrapped) ----
	[AppChannels.setTrayEnabled]: { args: [enabled: boolean]; result: void };
	[AppChannels.getTrayEnabled]: { args: []; result: boolean };

	// ---- Extensions (IpcResult-wrapped) ----
	[ExtensionChannels.list]: { args: []; result: ExtensionRuntimeInfo[] };
	[ExtensionChannels.getState]: { args: [extensionId: string]; result: ExtensionRuntimeState };
	[ExtensionChannels.getCommands]: { args: []; result: ExtensionCommandInfo[] };
	[ExtensionChannels.executeCommand]: {
		args: [commandId: string, payload?: unknown];
		result: ExtensionCommandExecutionResult;
	};
	[ExtensionChannels.getDocPanels]: {
		args: [documentId: string];
		result: ExtensionDocPanelInfo[];
	};
	[ExtensionChannels.getDocPanelContent]: {
		args: [panelId: string, documentId: string];
		result: ExtensionDocPanelContent;
	};
	[ExtensionChannels.refreshDocPanel]: {
		args: [panelId: string, documentId: string];
		result: ExtensionDocPanelContent;
	};
	[ExtensionChannels.setEnabled]: {
		args: [extensionId: string, enabled: boolean];
		result: void;
	};
	[ExtensionChannels.reload]: { args: [extensionId: string]; result: void };
	[ExtensionChannels.setActiveDocument]: { args: [documentId: string | null]; result: void };
	[ExtensionChannels.openFolder]: { args: []; result: void };

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

	// ---- Contents: workspace/contents/ (IpcResult-wrapped) ----
	[WorkspaceChannels.getContents]: { args: []; result: ResourceInfo[] };
	[WorkspaceChannels.getContentsFolders]: { args: []; result: FolderEntry[] };
	[WorkspaceChannels.insertContents]: { args: [extensions?: string[]]; result: ResourceInfo[] };
	[WorkspaceChannels.deleteContent]: { args: [id: string]; result: void };

	// ---- OCR model preference (IpcResult-wrapped) ----
	[WorkspaceChannels.getOcrModelId]: { args: []; result: string };
	[WorkspaceChannels.setOcrModelId]: { args: [modelId: string]; result: void };

	// ---- Files: workspace/files/ (IpcResult-wrapped) ----
	[WorkspaceChannels.getFiles]: { args: []; result: FileEntry[] };
	[WorkspaceChannels.insertFiles]: { args: [extensions?: string[]]; result: FileEntry[] };
	[WorkspaceChannels.deleteFileEntry]: { args: [id: string]; result: void };

	// ---- Images: workspace/images/ (IpcResult-wrapped) ----
	[WorkspaceChannels.getImages]: { args: []; result: ImageEntry[] };
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
	// ---- Files watcher events ----
	[WorkspaceChannels.filesChanged]: { data: FileEntryChangeEvent };
	// ---- Images watcher events ----
	[WorkspaceChannels.imagesChanged]: { data: ImageEntryChangeEvent };
	[ExtensionChannels.registryChanged]: { data: ExtensionRegistrySnapshot };
	[ExtensionChannels.runtimeChanged]: { data: ExtensionRuntimeChangedPayload };
	[ExtensionChannels.docPanelsChanged]: { data: ExtensionDocPanelsChangedPayload };
	[ExtensionChannels.docPanelContentChanged]: { data: ExtensionDocPanelContentChangedPayload };
}
