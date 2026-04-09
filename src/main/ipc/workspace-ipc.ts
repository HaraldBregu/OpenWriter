import { ipcMain, dialog, shell } from 'electron';
import type { IpcMainInvokeEvent, FileFilter } from 'electron';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../services/logger';
import type { Workspace } from '../workspace';
import type { ContentsService } from '../workspace/contents-service';
import type { FilesService } from '../workspace/files-service';
import type { FilesWatcherService } from '../workspace/files-watcher';
import type { WorkspaceService } from '../workspace/workspace-service';
import { wrapSimpleHandler, wrapIpcHandler } from './ipc-error-handler';
import { getWindowService, getWindowContext } from './ipc-helpers';
import { WorkspaceChannels } from '../../shared/channels';
import type {
	FsReadFileParams,
	FsWriteFileParams,
	FsCreateFileParams,
	FsCreateFolderParams,
	FsRenameParams,
	FsListDirParams,
	DocumentImageInfo,
	SaveDocumentImageParams,
	DocumentConfig,
} from '../../shared/types';

/**
 * IPC handlers for all workspace-related concerns.
 *
 * This is a thin pass-through layer: all business logic lives in Workspace.
 * Only Electron-specific APIs (dialog, shell) remain here.
 */
export class WorkspaceIpc implements IpcModule {
	readonly name = 'workspace';

	private mgr(event: IpcMainInvokeEvent, container: ServiceContainer): Workspace {
		return getWindowService<Workspace>(event, container, 'workspaceManager');
	}

	register(container: ServiceContainer, eventBus: EventBus): void {
		const logger = container.get<LoggerService>('logger');

		// -------------------------------------------------------------------------
		// Workspace state
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.selectFolder,
			wrapSimpleHandler(async () => {
				const result = await dialog.showOpenDialog({
					properties: ['openDirectory', 'createDirectory'],
					title: 'Select Workspace Folder',
					buttonLabel: 'Select Workspace',
				});

				if (!result.canceled && result.filePaths.length > 0) {
					const workspacePath = result.filePaths[0];
					logger.info('WorkspaceIpc', `Folder selected: ${workspacePath}`);
					return workspacePath;
				}
				return null;
			}, WorkspaceChannels.selectFolder)
		);

		ipcMain.handle(
			WorkspaceChannels.getCurrent,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent) => this.mgr(event, container).getCurrent(),
				WorkspaceChannels.getCurrent
			)
		);

		ipcMain.handle(
			WorkspaceChannels.setCurrent,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, workspacePath: string) =>
					this.mgr(event, container).setCurrent(workspacePath),
				WorkspaceChannels.setCurrent
			)
		);

		ipcMain.handle(
			WorkspaceChannels.getRecent,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent) => this.mgr(event, container).getRecent(),
				WorkspaceChannels.getRecent
			)
		);

		ipcMain.handle(
			WorkspaceChannels.clear,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent) => this.mgr(event, container).clear(),
				WorkspaceChannels.clear
			)
		);

		ipcMain.handle(
			WorkspaceChannels.directoryExists,
			wrapSimpleHandler((directoryPath: string) => {
				try {
					return fs.existsSync(directoryPath) && fs.statSync(directoryPath).isDirectory();
				} catch {
					return false;
				}
			}, WorkspaceChannels.directoryExists)
		);

		ipcMain.handle(
			WorkspaceChannels.removeRecent,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, workspacePath: string) =>
					this.mgr(event, container).removeRecent(workspacePath),
				WorkspaceChannels.removeRecent
			)
		);

		// -------------------------------------------------------------------------
		// Indexing info
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.getIndexingInfo,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent) => this.mgr(event, container).getIndexingInfo(),
				WorkspaceChannels.getIndexingInfo
			)
		);

		// -------------------------------------------------------------------------
		// Shell — Electron-specific, delegates path resolution to manager
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.openDataFolder,
			wrapIpcHandler(async (event: IpcMainInvokeEvent) => {
				const dataDir = this.mgr(event, container).getDataFolderPath();
				await shell.openPath(dataDir);
			}, WorkspaceChannels.openDataFolder)
		);

		ipcMain.handle(
			WorkspaceChannels.openResourcesFolder,
			wrapIpcHandler(async (event: IpcMainInvokeEvent) => {
				const resourcesDir = this.mgr(event, container).getResourcesFolderPath();
				await shell.openPath(resourcesDir);
			}, WorkspaceChannels.openResourcesFolder)
		);

		ipcMain.handle(
			WorkspaceChannels.openFilesFolder,
			wrapIpcHandler(async (event: IpcMainInvokeEvent) => {
				const ctx = getWindowContext(event, container);
				const workspaceService = ctx.getService<WorkspaceService>('workspace', container);
				const filesService = ctx.getService<FilesService>('filesService', container);
				const currentPath = workspaceService.getCurrent();
				if (!currentPath) return;
				await shell.openPath(filesService.getFilesDir(currentPath));
			}, WorkspaceChannels.openFilesFolder)
		);

		ipcMain.handle(
			WorkspaceChannels.openDocumentFolder,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, documentId: string) => {
				const documentDir = this.mgr(event, container).getDocumentFolderPath(documentId);
				await shell.openPath(documentDir);
			}, WorkspaceChannels.openDocumentFolder)
		);

		ipcMain.handle(
			WorkspaceChannels.openDocumentImagesFolder,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, documentId: string) => {
				const documentDir = this.mgr(event, container).getDocumentFolderPath(documentId);
				const imagesDir = path.join(documentDir, 'images');
				await fsPromises.mkdir(imagesDir, { recursive: true });
				await shell.openPath(imagesDir);
			}, WorkspaceChannels.openDocumentImagesFolder)
		);

		ipcMain.handle(
			WorkspaceChannels.getDocumentPath,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, documentId: string) =>
					this.mgr(event, container).getDocumentFolderPath(documentId),
				WorkspaceChannels.getDocumentPath
			)
		);

		ipcMain.handle(
			WorkspaceChannels.saveDocumentImage,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, params: SaveDocumentImageParams) => {
				const documentDir = this.mgr(event, container).getDocumentFolderPath(params.documentId);
				const imagesDir = path.join(documentDir, 'images');
				await fsPromises.mkdir(imagesDir, { recursive: true });
				const filePath = path.join(imagesDir, params.fileName);
				const buffer = Buffer.from(params.base64, 'base64');
				await fsPromises.writeFile(filePath, buffer);
				return { fileName: params.fileName, filePath };
			}, WorkspaceChannels.saveDocumentImage)
		);

		ipcMain.handle(
			WorkspaceChannels.listDocumentImages,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, documentId: string) => {
				const documentDir = this.mgr(event, container).getDocumentFolderPath(documentId);
				const imagesDir = path.join(documentDir, 'images');
				const imageExtensions = new Set([
					'.jpg',
					'.jpeg',
					'.png',
					'.gif',
					'.webp',
					'.svg',
					'.avif',
					'.bmp',
					'.ico',
					'.tiff',
					'.tif',
				]);

				try {
					const entries = await fsPromises.readdir(imagesDir, { withFileTypes: true });
					const images: DocumentImageInfo[] = [];

					for (const entry of entries) {
						if (!entry.isFile()) continue;
						const ext = path.extname(entry.name).toLowerCase();
						if (!imageExtensions.has(ext)) continue;
						const filePath = path.join(imagesDir, entry.name);
						const stat = await fsPromises.stat(filePath);
						images.push({
							fileName: entry.name,
							filePath,
							size: stat.size,
						});
					}

					return images;
				} catch (err) {
					if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
						return [];
					}
					throw err;
				}
			}, WorkspaceChannels.listDocumentImages)
		);

		// -------------------------------------------------------------------------
		// Documents — dialog stays here, import logic in manager
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.importFiles,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, extensions?: string[]) => {
				const hasFilter = extensions && extensions.length > 0;
				const filters: FileFilter[] = hasFilter
					? [
							{
								name: `Supported Files (${extensions.join(', ')})`,
								extensions: extensions.map((ext) => ext.replace(/^\./, '')),
							},
						]
					: [{ name: 'All Files', extensions: ['*'] }];

				const result = await dialog.showOpenDialog({
					properties: ['openFile', 'multiSelections'],
					filters,
					message: hasFilter ? `Supported formats: ${extensions.join(', ')}` : undefined,
				});

				if (result.canceled || result.filePaths.length === 0) {
					return [];
				}

				try {
					return await this.mgr(event, container).importFiles(result.filePaths, extensions);
				} catch (err) {
					const error = err as Error;
					if (error.message.includes('not supported')) {
						await dialog.showMessageBox({
							type: 'warning',
							title: 'Invalid File Types',
							message: error.message,
						});
						return [];
					}
					throw err;
				}
			}, WorkspaceChannels.importFiles)
		);

		ipcMain.handle(
			WorkspaceChannels.importByPaths,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, paths: string[]) =>
					this.mgr(event, container).importByPaths(paths),
				WorkspaceChannels.importByPaths
			)
		);

		ipcMain.handle(
			WorkspaceChannels.downloadFromUrl,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, url: string) => this.mgr(event, container).downloadFromUrl(url),
				WorkspaceChannels.downloadFromUrl
			)
		);

		ipcMain.handle(
			WorkspaceChannels.documentsLoadAll,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent) => this.mgr(event, container).loadDocuments(),
				WorkspaceChannels.documentsLoadAll
			)
		);

		ipcMain.handle(
			WorkspaceChannels.deleteFile,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, id: string) => this.mgr(event, container).deleteDocument(id),
				WorkspaceChannels.deleteFile
			)
		);

		// -------------------------------------------------------------------------
		// Directories
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.list,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent) => this.mgr(event, container).getDirectories(),
				WorkspaceChannels.list
			)
		);

		ipcMain.handle(
			WorkspaceChannels.add,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, dirPath: string) =>
					this.mgr(event, container).addDirectory(dirPath),
				WorkspaceChannels.add
			)
		);

		ipcMain.handle(
			WorkspaceChannels.addMany,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, dirPaths: string[]) =>
					this.mgr(event, container).addDirectories(dirPaths),
				WorkspaceChannels.addMany
			)
		);

		ipcMain.handle(
			WorkspaceChannels.remove,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, id: string) => this.mgr(event, container).removeDirectory(id),
				WorkspaceChannels.remove
			)
		);

		ipcMain.handle(
			WorkspaceChannels.validate,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, dirPath: string) =>
					this.mgr(event, container).validateDirectory(dirPath),
				WorkspaceChannels.validate
			)
		);

		ipcMain.handle(
			WorkspaceChannels.markIndexed,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, id: string, isIndexed: boolean) =>
					this.mgr(event, container).markDirectoryIndexed(id, isIndexed),
				WorkspaceChannels.markIndexed
			)
		);

		// -------------------------------------------------------------------------
		// Output files
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.outputSave,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, input: Parameters<Workspace['saveOutput']>[0]) =>
					this.mgr(event, container).saveOutput(input),
				WorkspaceChannels.outputSave
			)
		);

		ipcMain.handle(
			WorkspaceChannels.update,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, params: Parameters<Workspace['updateOutput']>[0]) =>
					this.mgr(event, container).updateOutput(params),
				WorkspaceChannels.update
			)
		);

		ipcMain.handle(
			WorkspaceChannels.outputLoadAll,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent) => this.mgr(event, container).loadOutputs(),
				WorkspaceChannels.outputLoadAll
			)
		);

		ipcMain.handle(
			WorkspaceChannels.loadByType,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, outputType: string) =>
					this.mgr(event, container).loadOutputsByType(outputType),
				WorkspaceChannels.loadByType
			)
		);

		ipcMain.handle(
			WorkspaceChannels.outputLoadOne,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, params: { type: string; id: string }) =>
					this.mgr(event, container).loadOutput(params),
				WorkspaceChannels.outputLoadOne
			)
		);

		ipcMain.handle(
			WorkspaceChannels.outputDelete,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, params: { type: string; id: string }) =>
					this.mgr(event, container).deleteOutput(params),
				WorkspaceChannels.outputDelete
			)
		);

		ipcMain.handle(
			WorkspaceChannels.outputTrash,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, params: { type: string; id: string }) =>
					this.mgr(event, container).trashOutput(params),
				WorkspaceChannels.outputTrash
			)
		);

		// -------------------------------------------------------------------------
		// Project workspace
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.getProjectInfo,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent) => this.mgr(event, container).getProjectInfo(),
				WorkspaceChannels.getProjectInfo
			)
		);

		ipcMain.handle(
			WorkspaceChannels.updateProjectName,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, name: string) =>
					this.mgr(event, container).updateProjectName(name),
				WorkspaceChannels.updateProjectName
			)
		);

		ipcMain.handle(
			WorkspaceChannels.updateProjectDescription,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, description: string) =>
					this.mgr(event, container).updateProjectDescription(description),
				WorkspaceChannels.updateProjectDescription
			)
		);

		// -------------------------------------------------------------------------
		// Filesystem
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.fsReadFile,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, params: FsReadFileParams) =>
					this.mgr(event, container).readFile(params),
				WorkspaceChannels.fsReadFile
			)
		);

		ipcMain.handle(
			WorkspaceChannels.fsWriteFile,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, params: FsWriteFileParams) =>
					this.mgr(event, container).writeFile(params),
				WorkspaceChannels.fsWriteFile
			)
		);

		ipcMain.handle(
			WorkspaceChannels.fsCreateFile,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, params: FsCreateFileParams) =>
					this.mgr(event, container).createFile(params),
				WorkspaceChannels.fsCreateFile
			)
		);

		ipcMain.handle(
			WorkspaceChannels.fsCreateFolder,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, params: FsCreateFolderParams) =>
					this.mgr(event, container).createFolder(params),
				WorkspaceChannels.fsCreateFolder
			)
		);

		ipcMain.handle(
			WorkspaceChannels.fsDeleteFolder,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, params: Parameters<Workspace['deleteFolder']>[0]) =>
					this.mgr(event, container).deleteFolder(params),
				WorkspaceChannels.fsDeleteFolder
			)
		);

		ipcMain.handle(
			WorkspaceChannels.fsRename,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, params: FsRenameParams) =>
					this.mgr(event, container).rename(params),
				WorkspaceChannels.fsRename
			)
		);

		ipcMain.handle(
			WorkspaceChannels.fsListDir,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, params: FsListDirParams) =>
					this.mgr(event, container).listDir(params),
				WorkspaceChannels.fsListDir
			)
		);

		// -------------------------------------------------------------------------
		// Document config
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.getDocumentConfig,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, documentId: string) =>
					this.mgr(event, container).getDocumentConfig(documentId),
				WorkspaceChannels.getDocumentConfig
			)
		);

		ipcMain.handle(
			WorkspaceChannels.updateDocumentConfig,
			wrapIpcHandler(
				async (event: IpcMainInvokeEvent, documentId: string, config: Partial<DocumentConfig>) => {
					const mgr = this.mgr(event, container);
					await mgr.updateDocumentConfig(documentId, config);
					const updated = await mgr.getDocumentConfig(documentId);
					eventBus.broadcast(WorkspaceChannels.documentConfigChanged, {
						documentId,
						config: updated,
					});
				},
				WorkspaceChannels.updateDocumentConfig
			)
		);

		// -------------------------------------------------------------------------
		// Document content
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.getDocumentContent,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, documentId: string) =>
					this.mgr(event, container).getDocumentContent(documentId),
				WorkspaceChannels.getDocumentContent
			)
		);

		ipcMain.handle(
			WorkspaceChannels.updateDocumentContent,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, documentId: string, content: string) => {
				await this.mgr(event, container).updateDocumentContent(documentId, content);
				eventBus.broadcast(WorkspaceChannels.documentContentChanged, {
					documentId,
					content,
				});
			}, WorkspaceChannels.updateDocumentContent)
		);

		// -------------------------------------------------------------------------
		// Files (resources/files/)
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.getFiles,
			wrapIpcHandler(async (event: IpcMainInvokeEvent) => {
				const ctx = getWindowContext(event, container);
				const workspaceService = ctx.getService<WorkspaceService>('workspace', container);
				const filesService = ctx.getService<FilesService>('filesService', container);
				const currentPath = workspaceService.getCurrent();
				if (!currentPath) {
					throw new Error('No workspace selected. Please select a workspace first.');
				}
				return filesService.getFiles(currentPath);
			}, WorkspaceChannels.getFiles)
		);

		ipcMain.handle(
			WorkspaceChannels.insertFiles,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, extensions?: string[]) => {
				const hasFilter = extensions && extensions.length > 0;
				const filters: FileFilter[] = hasFilter
					? [
							{
								name: `Supported Files (${extensions.join(', ')})`,
								extensions: extensions.map((ext) => ext.replace(/^\./, '')),
							},
						]
					: [{ name: 'All Files', extensions: ['*'] }];

				const result = await dialog.showOpenDialog({
					properties: ['openFile', 'multiSelections'],
					filters,
					message: hasFilter ? `Supported formats: ${extensions.join(', ')}` : undefined,
				});

				if (result.canceled || result.filePaths.length === 0) {
					return [];
				}

				const ctx = getWindowContext(event, container);
				const workspaceService = ctx.getService<WorkspaceService>('workspace', container);
				const filesService = ctx.getService<FilesService>('filesService', container);
				const filesWatcher = ctx.container.has('filesWatcher')
					? ctx.getService<FilesWatcherService>('filesWatcher', container)
					: null;

				const currentPath = workspaceService.getCurrent();
				if (!currentPath) {
					throw new Error('No workspace selected. Please select a workspace first.');
				}

				const markWritten = filesWatcher
					? (destPath: string) => filesWatcher.markFileAsWritten(destPath)
					: undefined;

				return filesService.insertFiles(currentPath, result.filePaths, markWritten);
			}, WorkspaceChannels.insertFiles)
		);

		ipcMain.handle(
			WorkspaceChannels.deleteFileEntry,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, id: string) => {
				const ctx = getWindowContext(event, container);
				const workspaceService = ctx.getService<WorkspaceService>('workspace', container);
				const filesService = ctx.getService<FilesService>('filesService', container);
				const filesWatcher = ctx.container.has('filesWatcher')
					? ctx.getService<FilesWatcherService>('filesWatcher', container)
					: null;

				const currentPath = workspaceService.getCurrent();
				if (!currentPath) {
					throw new Error('No workspace selected. Please select a workspace first.');
				}

				const markWritten = filesWatcher
					? (filePath: string) => filesWatcher.markFileAsWritten(filePath)
					: undefined;

				await filesService.deleteFile(currentPath, id, markWritten);
			}, WorkspaceChannels.deleteFileEntry)
		);

		logger.info('WorkspaceIpc', `Registered ${this.name} module`);
	}
}
