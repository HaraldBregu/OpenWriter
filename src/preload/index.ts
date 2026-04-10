import { contextBridge } from 'electron';
import { typedInvoke, typedInvokeUnwrap, typedInvokeRaw, typedSend, typedOn } from './typed-ipc';
import {
	AppChannels,
	WindowChannels,
	WorkspaceChannels,
	TaskChannels,
	LogChannels,
} from '../shared/channels';
import type { AppApi, WindowApi, WorkspaceApi, TaskApi } from './index.d';
import type { ServiceProvider, ThemeMode, WorkspaceInfo, DocumentConfig } from '../shared/types';

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
	// Provider management
	// -------------------------------------------------------------------------
	getProviders: (): Promise<Array<ServiceProvider & { id: string }>> => {
		return typedInvokeUnwrap(AppChannels.getProviders);
	},
	addProvider: (provider: ServiceProvider): Promise<ServiceProvider & { id: string }> => {
		return typedInvokeUnwrap(AppChannels.addProvider, provider);
	},
	deleteProvider: (id: string): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.deleteProvider, id);
	},
	getStartupInfo: () => {
		return typedInvokeUnwrap(AppChannels.getStartupInfo);
	},
	completeFirstRunConfiguration: (providers: ServiceProvider[]) => {
		return typedInvokeUnwrap(AppChannels.completeFirstRunConfiguration, providers);
	},
	getLogs: (limit?: number) => typedInvokeUnwrap(LogChannels.getLogs, limit),
	openLogsFolder: () => typedInvokeUnwrap(AppChannels.openLogsFolder),
	getCustomThemes: () => typedInvokeUnwrap(AppChannels.getCustomThemes),
	openThemesFolder: () => typedInvokeUnwrap(AppChannels.openThemesFolder),
	importTheme: () => typedInvokeUnwrap(AppChannels.importTheme),
	getCustomThemeTokens: (id: string) => typedInvokeUnwrap(AppChannels.getCustomThemeTokens, id),
	deleteTheme: (id: string) => typedInvokeUnwrap(AppChannels.deleteTheme, id),
	openSystemAccessibility: () => typedInvokeUnwrap(AppChannels.openSystemAccessibility),
	openSystemScreenRecording: () => typedInvokeUnwrap(AppChannels.openSystemScreenRecording),
	setTrayEnabled: (enabled: boolean) => typedInvokeUnwrap(AppChannels.setTrayEnabled, enabled),
	getTrayEnabled: () => typedInvokeUnwrap(AppChannels.getTrayEnabled),
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
	// Document import, download, and file-watch events
	// -------------------------------------------------------------------------
	importFiles: (
		extensions?: string[]
	): Promise<
		Array<{
			id: string;
			name: string;
			path: string;
			size: number;
			mimeType: string;
			importedAt: number;
			lastModified: number;
		}>
	> => {
		return typedInvokeUnwrap(WorkspaceChannels.importFiles, extensions);
	},
	importByPaths: (
		paths: string[]
	): Promise<
		Array<{
			id: string;
			name: string;
			path: string;
			size: number;
			mimeType: string;
			importedAt: number;
			lastModified: number;
		}>
	> => {
		return typedInvokeUnwrap(WorkspaceChannels.importByPaths, paths);
	},
	downloadFromUrl: (
		url: string
	): Promise<{
		id: string;
		name: string;
		path: string;
		size: number;
		mimeType: string;
		importedAt: number;
		lastModified: number;
	}> => {
		return typedInvokeUnwrap(WorkspaceChannels.downloadFromUrl, url);
	},
	loadDocuments: (): Promise<
		Array<{
			id: string;
			name: string;
			path: string;
			size: number;
			mimeType: string;
			importedAt: number;
			lastModified: number;
		}>
	> => {
		return typedInvokeUnwrap(WorkspaceChannels.documentsLoadAll);
	},
	deleteDocument: (id: string): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.deleteFile, id);
	},
	onDocumentFileChange: (
		callback: (event: {
			type: 'added' | 'changed' | 'removed';
			fileId: string;
			filePath: string;
			timestamp: number;
		}) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.documentsFileChanged, callback);
	},
	onDocumentWatcherError: (
		callback: (error: { error: string; timestamp: number }) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.documentsWatcherError, callback);
	},
	// -------------------------------------------------------------------------
	// Indexed directory management
	// -------------------------------------------------------------------------
	listDirectories: (): Promise<
		Array<{
			id: string;
			path: string;
			addedAt: number;
			isIndexed: boolean;
			lastIndexedAt?: number;
		}>
	> => {
		return typedInvokeUnwrap(WorkspaceChannels.list);
	},
	addDirectory: (
		dirPath: string
	): Promise<{
		id: string;
		path: string;
		addedAt: number;
		isIndexed: boolean;
		lastIndexedAt?: number;
	}> => {
		return typedInvokeUnwrap(WorkspaceChannels.add, dirPath);
	},
	addDirectories: (
		dirPaths: string[]
	): Promise<{
		added: Array<{
			id: string;
			path: string;
			addedAt: number;
			isIndexed: boolean;
			lastIndexedAt?: number;
		}>;
		errors: Array<{ path: string; error: string }>;
	}> => {
		return typedInvokeUnwrap(WorkspaceChannels.addMany, dirPaths);
	},
	removeDirectory: (id: string): Promise<boolean> => {
		return typedInvokeUnwrap(WorkspaceChannels.remove, id);
	},
	validateDirectory: (dirPath: string): Promise<{ valid: boolean; error?: string }> => {
		return typedInvokeUnwrap(WorkspaceChannels.validate, dirPath);
	},
	markDirectoryIndexed: (id: string, isIndexed: boolean): Promise<boolean> => {
		return typedInvokeUnwrap(WorkspaceChannels.markIndexed, id, isIndexed);
	},
	onDirectoriesChanged: (
		callback: (
			directories: Array<{
				id: string;
				path: string;
				addedAt: number;
				isIndexed: boolean;
				lastIndexedAt?: number;
			}>
		) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.directoriesChanged, callback);
	},
	// -------------------------------------------------------------------------
	// Indexing info
	// -------------------------------------------------------------------------
	getIndexingInfo: () => {
		return typedInvokeUnwrap(WorkspaceChannels.getIndexingInfo);
	},
	// -------------------------------------------------------------------------
	// Shell
	// -------------------------------------------------------------------------
	openDataFolder: (): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.openDataFolder);
	},
	openResourcesFolder: (): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.openResourcesFolder);
	},
	openFilesFolder: (): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.openFilesFolder);
	},
	openDocumentFolder: (documentId: string): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.openDocumentFolder, documentId);
	},
	openDocumentImagesFolder: (documentId: string): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.openDocumentImagesFolder, documentId);
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
	// Contents (resources/content/)
	// -------------------------------------------------------------------------
	getContents: () => typedInvokeUnwrap(WorkspaceChannels.getContents),
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
	// Files (resources/files/)
	// -------------------------------------------------------------------------
	getResourcesFiles: () => typedInvokeUnwrap(WorkspaceChannels.getResourcesFiles),
	insertResourcesFiles: (extensions?: string[]) =>
		typedInvokeUnwrap(WorkspaceChannels.insertResourcesFiles, extensions),
	deleteResourcesFileEntry: (id: string) =>
		typedInvokeUnwrap(WorkspaceChannels.deleteResourcesFileEntry, id),
	onResourcesFilesChanged: (
		callback: (event: {
			type: 'added' | 'changed' | 'removed';
			fileId: string;
			filePath: string;
			timestamp: number;
		}) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.resourcesFilesChanged, callback);
	},
	onResourcesFilesWatcherError: (
		callback: (error: { error: string; timestamp: number }) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.resourcesFilesWatcherError, callback);
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
	submit: (
		type: string,
		input: unknown,
		metadata?: Record<string, unknown>,
		options?: {
			priority?: 'low' | 'normal' | 'high';
			timeoutMs?: number;
			windowId?: number;
		}
	) => {
		return typedInvokeRaw(TaskChannels.submit, { type, input, metadata, options });
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
	updatePriority: (taskId: string, priority: 'low' | 'normal' | 'high') => {
		return typedInvokeRaw(TaskChannels.updatePriority, taskId, priority);
	},
	getResult: (taskId: string) => {
		return typedInvokeRaw(TaskChannels.getResult, taskId);
	},
	queueStatus: () => {
		return typedInvokeRaw(TaskChannels.queueStatus);
	},
} satisfies TaskApi;

// ---------------------------------------------------------------------------
// Registration — expose all namespaces via contextBridge
// ---------------------------------------------------------------------------
if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('app', app);
		contextBridge.exposeInMainWorld('win', win);
		contextBridge.exposeInMainWorld('workspace', workspace);
		contextBridge.exposeInMainWorld('task', task);
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
}
