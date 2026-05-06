import { ipcMain, dialog, shell } from 'electron';
import type { IpcMainInvokeEvent, FileFilter } from 'electron';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { Workspace } from '../workspace';
import type { ResourcesService } from '../workspace/resources-service';
import type { WorkspaceService } from '../workspace/workspace-service';
import { wrapIpcHandler } from './ipc-error-handler';
import { getWindowService, getWindowContext } from './ipc-helpers';
import { WorkspaceChannels } from '../../shared/channels';
import type {
	FsReadFileParams,
	FsWriteFileParams,
	FsCreateFolderParams,
	FsRenameParams,
	FsListDirParams,
	DocumentConfig,
	CreateWorkspaceParams,
	EditorMaxWidthType,
	EditorFontType,
} from '../../shared/types';

/**
 * IPC handlers for all workspace-related concerns.
 *
 * Thin pass-through: business logic lives in Workspace + ResourcesService.
 * Only Electron-specific APIs (dialog, shell) live here.
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
			WorkspaceChannels.list,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent) => this.mgr(event, container).listWorkspaces(),
				WorkspaceChannels.list
			)
		);

		ipcMain.handle(
			WorkspaceChannels.create,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, params: CreateWorkspaceParams) =>
					this.mgr(event, container).createWorkspace(params.name, params.description),
				WorkspaceChannels.create
			)
		);

		ipcMain.handle(
			WorkspaceChannels.clear,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent) => this.mgr(event, container).clear(),
				WorkspaceChannels.clear
			)
		);

		// -------------------------------------------------------------------------
		// Shell
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.openWorkspaceFolder,
			wrapIpcHandler(async (event: IpcMainInvokeEvent) => {
				const currentPath = this.mgr(event, container).getCurrent();
				if (!currentPath) return;
				await shell.openPath(currentPath);
			}, WorkspaceChannels.openWorkspaceFolder)
		);

		ipcMain.handle(
			WorkspaceChannels.openResourcesFolder,
			wrapIpcHandler(async (event: IpcMainInvokeEvent) => {
				const ctx = getWindowContext(event, container);
				const workspaceService = ctx.getService<WorkspaceService>('workspace', container);
				const resourcesService = ctx.getService<ResourcesService>('resourcesService', container);
				const currentPath = workspaceService.getCurrent();
				if (!currentPath) return;
				await resourcesService.ensureResourcesDir(currentPath);
				await shell.openPath(resourcesService.getResourcesDir(currentPath));
			}, WorkspaceChannels.openResourcesFolder)
		);

		ipcMain.handle(
			WorkspaceChannels.openDocumentFolder,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, documentId: string) => {
				const documentDir = this.mgr(event, container).getDocumentFolderPath(documentId);
				await shell.openPath(documentDir);
			}, WorkspaceChannels.openDocumentFolder)
		);

		ipcMain.handle(
			WorkspaceChannels.getDocumentPath,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, documentId: string) =>
					this.mgr(event, container).getDocumentFolderPath(documentId),
				WorkspaceChannels.getDocumentPath
			)
		);

		// -------------------------------------------------------------------------
		// Output files (documents)
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

		ipcMain.handle(
			WorkspaceChannels.updateMaxWidthType,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, value: EditorMaxWidthType) =>
					this.mgr(event, container).updateMaxWidthType(value),
				WorkspaceChannels.updateMaxWidthType
			)
		);

		ipcMain.handle(
			WorkspaceChannels.updateTextSize,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, percentage: number) =>
					this.mgr(event, container).updateTextSize(percentage),
				WorkspaceChannels.updateTextSize
			)
		);

		ipcMain.handle(
			WorkspaceChannels.updateFontType,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, value: EditorFontType) =>
					this.mgr(event, container).updateFontType(value),
				WorkspaceChannels.updateFontType
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
			WorkspaceChannels.fsReadFileBinary,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, filePath: string) =>
					this.mgr(event, container).readFileBinary(filePath),
				WorkspaceChannels.fsReadFileBinary
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
			WorkspaceChannels.fsDeleteFile,
			wrapIpcHandler(
				(event: IpcMainInvokeEvent, params: Parameters<Workspace['deleteFile']>[0]) =>
					this.mgr(event, container).deleteFile(params),
				WorkspaceChannels.fsDeleteFile
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
			wrapIpcHandler(
				async (event: IpcMainInvokeEvent, documentId: string, content: string) => {
					const mgr = this.mgr(event, container);
					await mgr.updateDocumentContent(documentId, content);
				},
				WorkspaceChannels.updateDocumentContent
			)
		);

		ipcMain.handle(
			WorkspaceChannels.updateDocumentConfig,
			wrapIpcHandler(
				async (
					event: IpcMainInvokeEvent,
					documentId: string,
					config: Partial<DocumentConfig>
				) => {
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
		// Resources (workspace/resources/)
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.getResources,
			wrapIpcHandler(async (event: IpcMainInvokeEvent) => {
				const ctx = getWindowContext(event, container);
				const workspaceService = ctx.getService<WorkspaceService>('workspace', container);
				const resourcesService = ctx.getService<ResourcesService>('resourcesService', container);
				const currentPath = workspaceService.getCurrent();
				if (!currentPath) {
					throw new Error('No workspace selected. Please select a workspace first.');
				}
				return resourcesService.getResources(currentPath);
			}, WorkspaceChannels.getResources)
		);

		ipcMain.handle(
			WorkspaceChannels.insertResources,
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
				const resourcesService = ctx.getService<ResourcesService>('resourcesService', container);
				const currentPath = workspaceService.getCurrent();
				if (!currentPath) {
					throw new Error('No workspace selected. Please select a workspace first.');
				}

				return resourcesService.insertResources(currentPath, result.filePaths, extensions);
			}, WorkspaceChannels.insertResources)
		);

		ipcMain.handle(
			WorkspaceChannels.deleteResource,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, id: string) => {
				const ctx = getWindowContext(event, container);
				const workspaceService = ctx.getService<WorkspaceService>('workspace', container);
				const resourcesService = ctx.getService<ResourcesService>('resourcesService', container);
				const currentPath = workspaceService.getCurrent();
				if (!currentPath) {
					throw new Error('No workspace selected. Please select a workspace first.');
				}
				await resourcesService.deleteResource(currentPath, id);
			}, WorkspaceChannels.deleteResource)
		);

		logger.info('WorkspaceIpc', `Registered ${this.name} module`);
	}
}
