import { ipcMain, dialog, shell } from 'electron';
import type { IpcMainInvokeEvent, FileFilter } from 'electron';
import fs from 'node:fs';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../services/logger';
import type { Workspace } from '../workspace';
import { wrapSimpleHandler, wrapIpcHandler } from './ipc-error-handler';
import { getWindowService } from './ipc-helpers';
import { WorkspaceChannels } from '../../shared/channels';
import type {
	FsReadFileParams,
	FsWriteFileParams,
	FsCreateFileParams,
	FsCreateFolderParams,
	FsRenameParams,
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

	register(container: ServiceContainer, _eventBus: EventBus): void {
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
			WorkspaceChannels.openDocumentFolder,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, documentId: string) => {
				const documentDir = this.mgr(event, container).getDocumentFolderPath(documentId);
				await shell.openPath(documentDir);
			}, WorkspaceChannels.openDocumentFolder)
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
			WorkspaceChannels.fsRename,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, params: FsRenameParams) =>
					this.mgr(event, container).rename(params),
				WorkspaceChannels.fsRename
			)
		);

		logger.info('WorkspaceIpc', `Registered ${this.name} module`);
	}
}
