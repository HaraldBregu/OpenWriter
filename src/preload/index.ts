import { contextBridge, webUtils } from 'electron';
import { typedInvoke, typedInvokeUnwrap, typedInvokeRaw, typedSend, typedOn } from './typed-ipc';
import {
	AppChannels,
	ExtensionChannels,
	WindowChannels,
	WorkspaceChannels,
	TaskChannels,
	LogChannels,
} from '../shared/channels';
import type { AppApi, ExtensionsApi, WindowApi, WorkspaceApi, TaskApi } from './index.d';
import type {
	AgentSettings,
	Service,
	ThemeMode,
	WorkspaceInfo,
	DocumentConfig,
} from '../shared/types';
import type { ShortcutId } from '../shared/shortcuts';

// ---------------------------------------------------------------------------
// window.app — General application utilities + persisted AI model settings
// ---------------------------------------------------------------------------
const app: AppApi = {
	playSound: (): void => {
		typedSend(AppChannels.playSound);
	},
	setTheme: (theme: ThemeMode): void => {
		typedSend(AppChannels.setTheme, theme);
	},
	setLanguage: (language: string): void => {
		typedSend(AppChannels.setLanguage, language);
	},
	showContextMenu: (): void => {
		typedSend(AppChannels.contextMenu);
	},
	showContextMenuEditable: (): void => {
		typedSend(AppChannels.contextMenuEditable);
	},
	onLanguageChange: (callback: (lng: string) => void): (() => void) => {
		return typedOn(AppChannels.changeLanguage, callback);
	},
	onThemeChange: (callback: (theme: ThemeMode) => void): (() => void) => {
		return typedOn(AppChannels.changeTheme, callback);
	},
	onFileOpened: (callback: (filePath: string) => void): (() => void) => {
		return typedOn(AppChannels.fileOpened, callback);
	},
	popupMenu: (): void => {
		typedSend(WindowChannels.popupMenu);
	},
	getPlatform: (): Promise<string> => {
		return typedInvoke(WindowChannels.getPlatform);
	},
	showWriting: (writingId: string, writingTitle: string): Promise<void> => {
		return typedInvoke(AppChannels.showWritingContextMenu, writingId, writingTitle);
	},
	onWritingAction: (
		callback: (data: { action: string; writingId: string }) => void
	): (() => void) => {
		return typedOn(AppChannels.writingContextMenuAction, callback);
	},
	// -------------------------------------------------------------------------
	// Service management
	// -------------------------------------------------------------------------
	getServices: (): Promise<Array<Service & { id: string }>> => {
		return typedInvokeUnwrap(AppChannels.getServices);
	},
	addService: (service: Service): Promise<Service & { id: string }> => {
		return typedInvokeUnwrap(AppChannels.addService, service);
	},
	deleteService: (id: string): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.deleteService, id);
	},
	getAgents: (): Promise<AgentSettings[]> => {
		return typedInvokeUnwrap(AppChannels.getAgents);
	},
	updateAgent: (agent: AgentSettings): Promise<AgentSettings> => {
		return typedInvokeUnwrap(AppChannels.updateAgent, agent);
	},
	getStartupInfo: () => {
		return typedInvokeUnwrap(AppChannels.getStartupInfo);
	},
	completeFirstRunConfiguration: (services: Service[]) => {
		return typedInvokeUnwrap(AppChannels.completeFirstRunConfiguration, services);
	},
	getLogs: (limit?: number) => typedInvokeUnwrap(LogChannels.getLogs, limit),
	openLogsFolder: () => typedInvokeUnwrap(AppChannels.openLogsFolder),
	openAppDataFolder: () => typedInvokeUnwrap(AppChannels.openAppDataFolder),
	getAppDataFolder: () => typedInvokeUnwrap(AppChannels.getAppDataFolder),
	getCustomThemes: () => typedInvokeUnwrap(AppChannels.getCustomThemes),
	openThemesFolder: () => typedInvokeUnwrap(AppChannels.openThemesFolder),
	importTheme: () => typedInvokeUnwrap(AppChannels.importTheme),
	getCustomThemeTokens: (id: string) => typedInvokeUnwrap(AppChannels.getCustomThemeTokens, id),
	deleteTheme: (id: string) => typedInvokeUnwrap(AppChannels.deleteTheme, id),
	getSkills: () => typedInvokeUnwrap(AppChannels.getSkills),
	openSkillsFolder: () => typedInvokeUnwrap(AppChannels.openSkillsFolder),
	importSkill: () => typedInvokeUnwrap(AppChannels.importSkill),
	deleteSkill: (id: string) => typedInvokeUnwrap(AppChannels.deleteSkill, id),
	openSystemAccessibility: () => typedInvokeUnwrap(AppChannels.openSystemAccessibility),
	openSystemScreenRecording: () => typedInvokeUnwrap(AppChannels.openSystemScreenRecording),
	setTrayEnabled: (enabled: boolean) => typedInvokeUnwrap(AppChannels.setTrayEnabled, enabled),
	getTrayEnabled: () => typedInvokeUnwrap(AppChannels.getTrayEnabled),
	getPathForFile: (file: File): string => webUtils.getPathForFile(file),
	onShortcut: (callback: (id: ShortcutId) => void): (() => void) => {
		return typedOn(AppChannels.shortcut, callback);
	},
} satisfies AppApi;

// ---------------------------------------------------------------------------
// window.win — Window controls
// ---------------------------------------------------------------------------
const win: WindowApi = {
	minimize: (): void => {
		typedSend(WindowChannels.minimize);
	},
	maximize: (): void => {
		typedSend(WindowChannels.maximize);
	},
	close: (): void => {
		typedSend(WindowChannels.close);
	},
	isMaximized: (): Promise<boolean> => {
		return typedInvokeUnwrap(WindowChannels.isMaximized);
	},
	isFullScreen: (): Promise<boolean> => {
		return typedInvokeUnwrap(WindowChannels.isFullScreen);
	},
	onMaximizeChange: (callback: (isMaximized: boolean) => void): (() => void) => {
		return typedOn(WindowChannels.maximizeChange, callback);
	},
	onFullScreenChange: (callback: (isFullScreen: boolean) => void): (() => void) => {
		return typedOn(WindowChannels.fullScreenChange, callback);
	},
} satisfies WindowApi;

// ---------------------------------------------------------------------------
// window.workspace — Workspace folder selection, documents, directories, output
// ---------------------------------------------------------------------------
const workspace: WorkspaceApi = {
	selectFolder: (): Promise<string | null> => {
		return typedInvokeUnwrap(WorkspaceChannels.selectFolder);
	},
	getCurrent: (): Promise<string | null> => {
		return typedInvokeUnwrap(WorkspaceChannels.getCurrent);
	},
	setCurrent: (workspacePath: string): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.setCurrent, workspacePath);
	},
	getRecent: (): Promise<WorkspaceInfo[]> => {
		return typedInvokeUnwrap(WorkspaceChannels.getRecent);
	},
	clear: (): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.clear);
	},
	directoryExists: (directoryPath: string): Promise<boolean> => {
		return typedInvokeUnwrap(WorkspaceChannels.directoryExists, directoryPath);
	},
	removeRecent: (workspacePath: string): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.removeRecent, workspacePath);
	},
	onChange: (
		callback: (event: { currentPath: string | null; previousPath: string | null }) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.changed, callback);
	},
	onDeleted: (
		callback: (event: {
			deletedPath: string;
			reason: 'deleted' | 'inaccessible' | 'renamed';
			timestamp: number;
		}) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.deleted, callback);
	},
	// -------------------------------------------------------------------------
	// Deprecated resources API — main-side removed. Stubs kept so the
	// renderer surface still compiles; calls reject at runtime.
	// -------------------------------------------------------------------------
	importFiles: (): Promise<never> =>
		Promise.reject(new Error('resources API removed from main process')),
	loadDocuments: (): Promise<never> =>
		Promise.reject(new Error('resources API removed from main process')),
	deleteDocument: (): Promise<never> =>
		Promise.reject(new Error('resources API removed from main process')),
	onDocumentFileChange: (): (() => void) => () => {},
	// -------------------------------------------------------------------------
	// Indexing info
	// -------------------------------------------------------------------------
	getIndexingInfo: () => {
		return typedInvokeUnwrap(WorkspaceChannels.getIndexingInfo);
	},
	// -------------------------------------------------------------------------
	// Shell
	// -------------------------------------------------------------------------
	openWorkspaceFolder: (): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.openWorkspaceFolder);
	},
	openDataFolder: (): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.openDataFolder);
	},
	openContentsFolder: (): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.openContentsFolder);
	},
	openFilesFolder: (): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.openFilesFolder);
	},
	openDocumentFolder: (documentId: string): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.openDocumentFolder, documentId);
	},
	getDocumentPath: (documentId: string): Promise<string> => {
		return typedInvokeUnwrap(WorkspaceChannels.getDocumentPath, documentId);
	},
	saveDocumentImage: (params: {
		documentId: string;
		fileName: string;
		base64: string;
	}): Promise<{ fileName: string; filePath: string }> => {
		return typedInvokeUnwrap(WorkspaceChannels.saveDocumentImage, params);
	},
	listDocumentImages: (
		documentId: string
	): Promise<{ fileName: string; filePath: string; size: number }[]> => {
		return typedInvokeUnwrap(WorkspaceChannels.listDocumentImages, documentId);
	},
	onDocumentImageChange: (
		callback: (event: {
			type: 'added' | 'changed' | 'removed';
			documentId: string;
			fileName: string;
			filePath: string;
			timestamp: number;
		}) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.documentImageChanged, callback);
	},
	// -------------------------------------------------------------------------
	// Output file management (documents)
	// -------------------------------------------------------------------------
	saveOutput: (input: {
		type: string;
		content: string;
		metadata?: Record<string, unknown>;
	}): Promise<{ id: string; path: string; savedAt: number }> => {
		return typedInvokeUnwrap(WorkspaceChannels.outputSave, input);
	},
	loadOutputs: () => {
		return typedInvokeUnwrap(WorkspaceChannels.outputLoadAll);
	},
	loadOutputsByType: (type: string) => {
		return typedInvokeUnwrap(WorkspaceChannels.loadByType, type);
	},
	loadOutput: (params: { type: string; id: string }) => {
		return typedInvokeUnwrap(WorkspaceChannels.outputLoadOne, params);
	},
	updateOutput: (params: {
		type: string;
		id: string;
		content: string;
		metadata: Record<string, unknown>;
	}): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.update, params);
	},
	deleteOutput: (params: { type: string; id: string }): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.outputDelete, params);
	},
	trashOutput: (params: { type: string; id: string }): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.outputTrash, params);
	},
	onOutputFileChange: (
		callback: (event: {
			type: 'added' | 'changed' | 'removed';
			outputType: string;
			fileId: string;
			filePath: string;
			timestamp: number;
		}) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.outputFileChanged, callback);
	},
	onOutputWatcherError: (
		callback: (error: { error: string; timestamp: number }) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.outputWatcherError, callback);
	},
	// -------------------------------------------------------------------------
	// Project workspace (project_workspace.openwriter)
	// -------------------------------------------------------------------------
	getProjectInfo: () => typedInvokeUnwrap(WorkspaceChannels.getProjectInfo),
	updateProjectName: (name: string) => typedInvokeUnwrap(WorkspaceChannels.updateProjectName, name),
	updateProjectDescription: (description: string) =>
		typedInvokeUnwrap(WorkspaceChannels.updateProjectDescription, description),
	// -------------------------------------------------------------------------
	// OCR model preference
	// -------------------------------------------------------------------------
	getOcrModelId: () => typedInvokeUnwrap(WorkspaceChannels.getOcrModelId),
	setOcrModelId: (modelId: string) => typedInvokeUnwrap(WorkspaceChannels.setOcrModelId, modelId),
	// -------------------------------------------------------------------------
	// Document config
	// -------------------------------------------------------------------------
	getDocumentConfig: (documentId: string) =>
		typedInvokeUnwrap(WorkspaceChannels.getDocumentConfig, documentId),
	updateDocumentConfig: (documentId: string, config: Partial<DocumentConfig>) =>
		typedInvokeUnwrap(WorkspaceChannels.updateDocumentConfig, documentId, config),
	onDocumentConfigChanges: (
		documentId: string,
		callback: (config: DocumentConfig) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.documentConfigChanged, (event) => {
			if (event.documentId === documentId) {
				callback(event.config);
			}
		});
	},
	// -------------------------------------------------------------------------
	// Document content
	// -------------------------------------------------------------------------
	getDocumentContent: (documentId: string) =>
		typedInvokeUnwrap(WorkspaceChannels.getDocumentContent, documentId),
	updateDocumentContent: (documentId: string, content: string) =>
		typedInvokeUnwrap(WorkspaceChannels.updateDocumentContent, documentId, content),
	onDocumentContentChanges: (
		documentId: string,
		callback: (content: string) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.documentContentChanged, (event) => {
			if (event.documentId === documentId) {
				callback(event.content);
			}
		});
	},
	// -------------------------------------------------------------------------
	// Contents (workspace/contents/)
	// -------------------------------------------------------------------------
	getContents: () => typedInvokeUnwrap(WorkspaceChannels.getContents),
	getContentsFolders: () => typedInvokeUnwrap(WorkspaceChannels.getContentsFolders),
	insertContents: (extensions?: string[]) =>
		typedInvokeUnwrap(WorkspaceChannels.insertContents, extensions),
	deleteContent: (id: string) => typedInvokeUnwrap(WorkspaceChannels.deleteContent, id),
	onContentsChanged: (
		callback: (event: {
			type: 'added' | 'changed' | 'removed';
			fileId: string;
			filePath: string;
			timestamp: number;
		}) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.contentsChanged, callback);
	},
	onContentsWatcherError: (
		callback: (error: { error: string; timestamp: number }) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.contentsWatcherError, callback);
	},
	// -------------------------------------------------------------------------
	// Files (workspace/files/)
	// -------------------------------------------------------------------------
	getFiles: () => typedInvokeUnwrap(WorkspaceChannels.getFiles),
	insertFiles: (extensions?: string[]) =>
		typedInvokeUnwrap(WorkspaceChannels.insertFiles, extensions),
	deleteFileEntry: (id: string) => typedInvokeUnwrap(WorkspaceChannels.deleteFileEntry, id),
	onFilesChanged: (
		callback: (event: {
			type: 'added' | 'changed' | 'removed';
			fileId: string;
			filePath: string;
			timestamp: number;
		}) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.filesChanged, callback);
	},
	onFilesWatcherError: (
		callback: (error: { error: string; timestamp: number }) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.filesWatcherError, callback);
	},
	// -------------------------------------------------------------------------
	// Images (workspace/images/)
	// -------------------------------------------------------------------------
	getImages: () => typedInvokeUnwrap(WorkspaceChannels.getImages),
	insertImages: (extensions?: string[]) =>
		typedInvokeUnwrap(WorkspaceChannels.insertImages, extensions),
	deleteImage: (id: string) => typedInvokeUnwrap(WorkspaceChannels.deleteImage, id),
	onImagesChanged: (
		callback: (event: {
			type: 'added' | 'changed' | 'removed';
			imageId: string;
			imagePath: string;
			timestamp: number;
		}) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.imagesChanged, callback);
	},
	onImagesWatcherError: (
		callback: (error: { error: string; timestamp: number }) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.imagesWatcherError, callback);
	},
	// -------------------------------------------------------------------------
	// Filesystem
	// -------------------------------------------------------------------------
	readFile: (params) => typedInvokeUnwrap(WorkspaceChannels.fsReadFile, params),
	readFileBinary: (filePath) => typedInvokeUnwrap(WorkspaceChannels.fsReadFileBinary, filePath),
	writeFile: (params) => typedInvokeUnwrap(WorkspaceChannels.fsWriteFile, params),
	createFile: (params) => typedInvokeUnwrap(WorkspaceChannels.fsCreateFile, params),
	createFolder: (params) => typedInvokeUnwrap(WorkspaceChannels.fsCreateFolder, params),
	deleteFolder: (params) => typedInvokeUnwrap(WorkspaceChannels.fsDeleteFolder, params),
	rename: (params) => typedInvokeUnwrap(WorkspaceChannels.fsRename, params),
	listDir: (params) => typedInvokeUnwrap(WorkspaceChannels.fsListDir, params),
} satisfies WorkspaceApi;

// ---------------------------------------------------------------------------
// window.task — Background task queue
// ---------------------------------------------------------------------------
const task: TaskApi = {
	submit: (action) => {
		return typedInvokeRaw(TaskChannels.submit, action);
	},
	cancel: (taskId: string) => {
		return typedInvokeRaw(TaskChannels.cancel, taskId);
	},
	list: () => {
		return typedInvokeRaw(TaskChannels.list);
	},
	onEvent: (callback) => {
		return typedOn(TaskChannels.event, callback);
	},
} satisfies TaskApi;

// ---------------------------------------------------------------------------
// window.extensions — Extension registry and command execution
// ---------------------------------------------------------------------------
const extensions: ExtensionsApi = {
	list: () => typedInvokeUnwrap(ExtensionChannels.list),
	getState: (extensionId) => typedInvokeUnwrap(ExtensionChannels.getState, extensionId),
	getCommands: () => typedInvokeUnwrap(ExtensionChannels.getCommands),
	getDocPanels: (documentId) => typedInvokeUnwrap(ExtensionChannels.getDocPanels, documentId),
	getDocPanelContent: (panelId, documentId) =>
		typedInvokeUnwrap(ExtensionChannels.getDocPanelContent, panelId, documentId),
	refreshDocPanel: (panelId, documentId) =>
		typedInvokeUnwrap(ExtensionChannels.refreshDocPanel, panelId, documentId),
	executeCommand: (commandId, payload) =>
		typedInvokeUnwrap(ExtensionChannels.executeCommand, commandId, payload),
	executeDocPanelAction: (commandId, payload) =>
		typedInvokeUnwrap(ExtensionChannels.executeCommand, commandId, payload),
	setEnabled: (extensionId, enabled) =>
		typedInvokeUnwrap(ExtensionChannels.setEnabled, extensionId, enabled),
	reload: (extensionId) => typedInvokeUnwrap(ExtensionChannels.reload, extensionId),
	setActiveDocument: (documentId) =>
		typedInvokeUnwrap(ExtensionChannels.setActiveDocument, documentId),
	openFolder: () => typedInvokeUnwrap(ExtensionChannels.openFolder),
	onRegistryChanged: (callback) => typedOn(ExtensionChannels.registryChanged, callback),
	onRuntimeChanged: (callback) => typedOn(ExtensionChannels.runtimeChanged, callback),
	onDocPanelsChanged: (callback) => typedOn(ExtensionChannels.docPanelsChanged, callback),
	onDocPanelContentChanged: (callback) =>
		typedOn(ExtensionChannels.docPanelContentChanged, callback),
} satisfies ExtensionsApi;

// ---------------------------------------------------------------------------
// Registration — expose all namespaces via contextBridge
// ---------------------------------------------------------------------------
if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('app', app);
		contextBridge.exposeInMainWorld('win', win);
		contextBridge.exposeInMainWorld('workspace', workspace);
		contextBridge.exposeInMainWorld('task', task);
		contextBridge.exposeInMainWorld('extensions', extensions);
	} catch (error) {
		console.error('[preload] Failed to expose IPC APIs:', error);
	}
} else {
	// @ts-ignore (define in dts)
	globalThis.app = app;
	// @ts-ignore (define in dts)
	globalThis.win = win;
	// @ts-ignore (define in dts)
	globalThis.workspace = workspace;
	// @ts-ignore (define in dts)
	globalThis.task = task;
	// @ts-ignore (define in dts)
	globalThis.extensions = extensions;
}
