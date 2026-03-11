import { ipcMain, dialog, shell } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { WorkspaceService } from '../services/workspace';
import type { LoggerService } from '../services/logger';
import type { DocumentsWatcherService } from '../services/documents-watcher';
import type { FileManagementService } from '../services/file-management-service';
import type { WorkspaceMetadataService } from '../services/workspace-metadata';
import type {
	OutputFilesService,
	OutputFile,
	OutputType,
	SaveOutputFileInput,
	SaveOutputFileResult,
} from '../services/output-files';
import { VALID_OUTPUT_TYPES } from '../services/output-files';
import { DocumentsService } from '../services/documents';
import type { FileFilter } from 'electron';
import { wrapSimpleHandler, wrapIpcHandler } from './ipc-error-handler';
import { getWindowService } from './ipc-helpers';
import { WorkspaceChannels } from '../../shared/channels';

/**
 * IPC handlers for all workspace-related concerns:
 *   - Workspace folder selection & recent history
 *   - Documents (import, download, load, delete)
 *   - Indexed directories management
 *   - Output files (posts & writings)
 */
export class WorkspaceIpc implements IpcModule {
	readonly name = 'workspace';

	register(container: ServiceContainer, _eventBus: EventBus): void {
		const logger = container.get<LoggerService>('logger');

		// -------------------------------------------------------------------------
		// Workspace
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
			wrapIpcHandler((event: IpcMainInvokeEvent) => {
				const workspace = getWindowService<WorkspaceService>(event, container, 'workspace');
				return workspace.getCurrent();
			}, WorkspaceChannels.getCurrent)
		);

		ipcMain.handle(
			WorkspaceChannels.setCurrent,
			wrapIpcHandler((event: IpcMainInvokeEvent, workspacePath: string) => {
				const workspace = getWindowService<WorkspaceService>(event, container, 'workspace');
				logger.info('WorkspaceIpc', `Setting workspace: ${workspacePath}`);
				workspace.setCurrent(workspacePath);
			}, WorkspaceChannels.setCurrent)
		);

		ipcMain.handle(
			WorkspaceChannels.getRecent,
			wrapIpcHandler((event: IpcMainInvokeEvent) => {
				const workspace = getWindowService<WorkspaceService>(event, container, 'workspace');
				return workspace.getRecent();
			}, WorkspaceChannels.getRecent)
		);

		ipcMain.handle(
			WorkspaceChannels.clear,
			wrapIpcHandler((event: IpcMainInvokeEvent) => {
				const workspace = getWindowService<WorkspaceService>(event, container, 'workspace');
				workspace.clear();
			}, WorkspaceChannels.clear)
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
			wrapIpcHandler((event: IpcMainInvokeEvent, workspacePath: string) => {
				const workspace = getWindowService<WorkspaceService>(event, container, 'workspace');
				workspace.removeRecent(workspacePath);
				logger.info('WorkspaceIpc', `Removed from recent: ${workspacePath}`);
			}, WorkspaceChannels.removeRecent)
		);

		// -------------------------------------------------------------------------
		// Indexing info
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.getIndexingInfo,
			wrapIpcHandler(async (event: IpcMainInvokeEvent) => {
				const workspace = getWindowService<WorkspaceService>(event, container, 'workspace');
				const currentWorkspace = workspace.getCurrent();
				if (!currentWorkspace) return null;

				const infoPath = path.join(currentWorkspace, 'data', 'indexing-info.json');
				try {
					const content = await fsPromises.readFile(infoPath, 'utf-8');
					return JSON.parse(content);
				} catch {
					return null;
				}
			}, WorkspaceChannels.getIndexingInfo)
		);

		// -------------------------------------------------------------------------
		// Shell — open folder in OS file explorer
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.openDataFolder,
			wrapIpcHandler(async (event: IpcMainInvokeEvent) => {
				const workspace = getWindowService<WorkspaceService>(event, container, 'workspace');
				const currentWorkspace = workspace.getCurrent();
				if (!currentWorkspace) {
					throw new Error('No workspace selected.');
				}

				const dataDir = path.join(currentWorkspace, 'data');
				if (!fs.existsSync(dataDir) || !fs.statSync(dataDir).isDirectory()) {
					throw new Error('Data folder does not exist. Run indexing first.');
				}

				await shell.openPath(dataDir);
			}, WorkspaceChannels.openDataFolder)
		);

		// -------------------------------------------------------------------------
		// Documents
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.importFiles,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, extensions?: string[]) => {
				const workspace = getWindowService<WorkspaceService>(event, container, 'workspace');
				const fileManagement = container.get<FileManagementService>('fileManagement');
				const watcher = this.tryGetWindowService<DocumentsWatcherService>(
					event,
					container,
					'documentsWatcher'
				);

				const currentWorkspace = workspace.getCurrent();
				if (!currentWorkspace) {
					throw new Error('No workspace selected. Please select a workspace first.');
				}

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

				const documentsService = new DocumentsService(fileManagement, watcher);
				try {
					return await documentsService.importFiles(currentWorkspace, result.filePaths, extensions);
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
			wrapIpcHandler(async (event: IpcMainInvokeEvent, paths: string[]) => {
				const workspace = getWindowService<WorkspaceService>(event, container, 'workspace');
				const fileManagement = container.get<FileManagementService>('fileManagement');
				const watcher = this.tryGetWindowService<DocumentsWatcherService>(
					event,
					container,
					'documentsWatcher'
				);

				const currentWorkspace = workspace.getCurrent();
				if (!currentWorkspace) {
					throw new Error('No workspace selected. Please select a workspace first.');
				}

				const documentsService = new DocumentsService(fileManagement, watcher);
				return await documentsService.importFiles(currentWorkspace, paths);
			}, WorkspaceChannels.importByPaths)
		);

		ipcMain.handle(
			WorkspaceChannels.downloadFromUrl,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, url: string) => {
				this.validateDownloadUrl(url);

				const workspace = getWindowService<WorkspaceService>(event, container, 'workspace');
				const fileManagement = container.get<FileManagementService>('fileManagement');
				const watcher = this.tryGetWindowService<DocumentsWatcherService>(
					event,
					container,
					'documentsWatcher'
				);

				const currentWorkspace = workspace.getCurrent();
				if (!currentWorkspace) {
					throw new Error('No workspace selected. Please select a workspace first.');
				}

				const documentsService = new DocumentsService(fileManagement, watcher);
				return await documentsService.downloadFromUrl(currentWorkspace, url);
			}, WorkspaceChannels.downloadFromUrl)
		);

		ipcMain.handle(
			WorkspaceChannels.documentsLoadAll,
			wrapIpcHandler(async (event: IpcMainInvokeEvent) => {
				const workspace = getWindowService<WorkspaceService>(event, container, 'workspace');
				const fileManagement = container.get<FileManagementService>('fileManagement');
				const watcher = this.tryGetWindowService<DocumentsWatcherService>(
					event,
					container,
					'documentsWatcher'
				);

				const currentWorkspace = workspace.getCurrent();
				if (!currentWorkspace) {
					throw new Error('No workspace selected. Please select a workspace first.');
				}

				const documentsService = new DocumentsService(fileManagement, watcher);
				return await documentsService.loadAll(currentWorkspace);
			}, WorkspaceChannels.documentsLoadAll)
		);

		ipcMain.handle(
			WorkspaceChannels.deleteFile,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, id: string) => {
				const workspace = getWindowService<WorkspaceService>(event, container, 'workspace');
				const fileManagement = container.get<FileManagementService>('fileManagement');
				const watcher = this.tryGetWindowService<DocumentsWatcherService>(
					event,
					container,
					'documentsWatcher'
				);

				const currentWorkspace = workspace.getCurrent();
				if (!currentWorkspace) {
					throw new Error('No workspace selected. Please select a workspace first.');
				}

				const documentsService = new DocumentsService(fileManagement, watcher);
				await documentsService.deleteFile(id, currentWorkspace);
			}, WorkspaceChannels.deleteFile)
		);

		// -------------------------------------------------------------------------
		// Directories
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.list,
			wrapIpcHandler((event: IpcMainInvokeEvent) => {
				const metadata = getWindowService<WorkspaceMetadataService>(
					event,
					container,
					'workspaceMetadata'
				);
				return metadata.getDirectories();
			}, WorkspaceChannels.list)
		);

		ipcMain.handle(
			WorkspaceChannels.add,
			wrapIpcHandler((event: IpcMainInvokeEvent, dirPath: string) => {
				const metadata = getWindowService<WorkspaceMetadataService>(
					event,
					container,
					'workspaceMetadata'
				);
				return metadata.addDirectory(dirPath);
			}, WorkspaceChannels.add)
		);

		ipcMain.handle(
			WorkspaceChannels.addMany,
			wrapIpcHandler((event: IpcMainInvokeEvent, dirPaths: string[]) => {
				const metadata = getWindowService<WorkspaceMetadataService>(
					event,
					container,
					'workspaceMetadata'
				);
				return metadata.addDirectories(dirPaths);
			}, WorkspaceChannels.addMany)
		);

		ipcMain.handle(
			WorkspaceChannels.remove,
			wrapIpcHandler((event: IpcMainInvokeEvent, id: string) => {
				const metadata = getWindowService<WorkspaceMetadataService>(
					event,
					container,
					'workspaceMetadata'
				);
				return metadata.removeDirectory(id);
			}, WorkspaceChannels.remove)
		);

		ipcMain.handle(
			WorkspaceChannels.validate,
			wrapIpcHandler((event: IpcMainInvokeEvent, dirPath: string) => {
				const metadata = getWindowService<WorkspaceMetadataService>(
					event,
					container,
					'workspaceMetadata'
				);
				return metadata.validateDirectory(dirPath);
			}, WorkspaceChannels.validate)
		);

		ipcMain.handle(
			WorkspaceChannels.markIndexed,
			wrapIpcHandler((event: IpcMainInvokeEvent, id: string, isIndexed: boolean) => {
				const metadata = getWindowService<WorkspaceMetadataService>(
					event,
					container,
					'workspaceMetadata'
				);
				return metadata.markDirectoryIndexed(id, isIndexed);
			}, WorkspaceChannels.markIndexed)
		);

		// -------------------------------------------------------------------------
		// Output files
		// -------------------------------------------------------------------------

		ipcMain.handle(
			WorkspaceChannels.outputSave,
			wrapIpcHandler(
				async (
					event: IpcMainInvokeEvent,
					input: SaveOutputFileInput
				): Promise<SaveOutputFileResult> => {
					const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles');

					if (!input.type || typeof input.type !== 'string') {
						throw new Error('Invalid type: must be a non-empty string');
					}
					if (!this.isValidOutputType(input.type)) {
						throw new Error(
							`Invalid output type "${input.type}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
						);
					}
					if (typeof input.content !== 'string') {
						throw new Error('Invalid content: must be a string');
					}
					if (
						!input.metadata ||
						typeof input.metadata !== 'object' ||
						Array.isArray(input.metadata)
					) {
						throw new Error('Invalid metadata: must be an object');
					}

					const result = await outputFiles.save(input);
					logger.info('WorkspaceIpc', `Saved output file for type ${input.type}: ${result.id}`);
					return result;
				},
				WorkspaceChannels.outputSave
			)
		);

		ipcMain.handle(
			WorkspaceChannels.update,
			wrapIpcHandler(
				async (
					event: IpcMainInvokeEvent,
					params: {
						type: string;
						id: string;
						content: string;
						metadata: Record<string, unknown>;
					}
				): Promise<void> => {
					const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles');

					if (!params.type || typeof params.type !== 'string') {
						throw new Error('Invalid type: must be a non-empty string');
					}
					if (!this.isValidOutputType(params.type)) {
						throw new Error(
							`Invalid output type "${params.type}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
						);
					}
					if (!params.id || typeof params.id !== 'string') {
						throw new Error('Invalid id: must be a non-empty string');
					}
					if (typeof params.content !== 'string') {
						throw new Error('Invalid content: must be a string');
					}
					if (
						!params.metadata ||
						typeof params.metadata !== 'object' ||
						Array.isArray(params.metadata)
					) {
						throw new Error('Invalid metadata: must be an object');
					}

					await outputFiles.update(params.type as OutputType, params.id, {
						content: params.content,
						metadata: params.metadata as Parameters<OutputFilesService['update']>[2]['metadata'],
					});
					logger.info('WorkspaceIpc', `Updated output file: ${params.type}/${params.id}`);
				},
				WorkspaceChannels.update
			)
		);

		ipcMain.handle(
			WorkspaceChannels.outputLoadAll,
			wrapIpcHandler(async (event: IpcMainInvokeEvent): Promise<OutputFile[]> => {
				const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles');
				const files = await outputFiles.loadAll();
				logger.info('WorkspaceIpc', `Loaded ${files.length} output files`);
				return files;
			}, WorkspaceChannels.outputLoadAll)
		);

		ipcMain.handle(
			WorkspaceChannels.loadByType,
			wrapIpcHandler(
				async (event: IpcMainInvokeEvent, outputType: string): Promise<OutputFile[]> => {
					const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles');

					if (!outputType || typeof outputType !== 'string') {
						throw new Error('Invalid type: must be a non-empty string');
					}
					if (!this.isValidOutputType(outputType)) {
						throw new Error(
							`Invalid output type "${outputType}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
						);
					}

					const files = await outputFiles.loadByType(outputType as OutputType);
					logger.info(
						'WorkspaceIpc',
						`Loaded ${files.length} output files for type "${outputType}"`
					);
					return files;
				},
				WorkspaceChannels.loadByType
			)
		);

		ipcMain.handle(
			WorkspaceChannels.outputLoadOne,
			wrapIpcHandler(
				async (
					event: IpcMainInvokeEvent,
					params: { type: string; id: string }
				): Promise<OutputFile | null> => {
					const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles');

					if (!params.type || typeof params.type !== 'string') {
						throw new Error('Invalid type: must be a non-empty string');
					}
					if (!this.isValidOutputType(params.type)) {
						throw new Error(
							`Invalid output type "${params.type}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
						);
					}
					if (!params.id || typeof params.id !== 'string') {
						throw new Error('Invalid id: must be a non-empty string');
					}

					const file = await outputFiles.loadOne(params.type as OutputType, params.id);
					if (file) {
						logger.info('WorkspaceIpc', `Loaded output file: ${params.type}/${params.id}`);
					} else {
						logger.info('WorkspaceIpc', `Output file not found: ${params.type}/${params.id}`);
					}
					return file;
				},
				WorkspaceChannels.outputLoadOne
			)
		);

		ipcMain.handle(
			WorkspaceChannels.outputDelete,
			wrapIpcHandler(
				async (event: IpcMainInvokeEvent, params: { type: string; id: string }): Promise<void> => {
					const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles');

					if (!params.type || typeof params.type !== 'string') {
						throw new Error('Invalid type: must be a non-empty string');
					}
					if (!this.isValidOutputType(params.type)) {
						throw new Error(
							`Invalid output type "${params.type}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
						);
					}
					if (!params.id || typeof params.id !== 'string') {
						throw new Error('Invalid id: must be a non-empty string');
					}

					await outputFiles.delete(params.type as OutputType, params.id);
					logger.info('WorkspaceIpc', `Deleted output file: ${params.type}/${params.id}`);
				},
				WorkspaceChannels.outputDelete
			)
		);

		ipcMain.handle(
			WorkspaceChannels.outputTrash,
			wrapIpcHandler(
				async (event: IpcMainInvokeEvent, params: { type: string; id: string }): Promise<void> => {
					const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles');

					if (!params.type || typeof params.type !== 'string') {
						throw new Error('Invalid type: must be a non-empty string');
					}
					if (!this.isValidOutputType(params.type)) {
						throw new Error(
							`Invalid output type "${params.type}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
						);
					}
					if (!params.id || typeof params.id !== 'string') {
						throw new Error('Invalid id: must be a non-empty string');
					}

					await outputFiles.trash(params.type as OutputType, params.id);
					logger.info('WorkspaceIpc', `Trashed output file: ${params.type}/${params.id}`);
				},
				WorkspaceChannels.outputTrash
			)
		);

		logger.info('WorkspaceIpc', `Registered ${this.name} module`);
	}

	// ---------------------------------------------------------------------------
	// Private helpers
	// ---------------------------------------------------------------------------

	private tryGetWindowService<T>(
		event: IpcMainInvokeEvent,
		container: ServiceContainer,
		serviceName: string
	): T | null {
		try {
			const windowService = (container as any).windowServices?.get(event.sender.id)?.[serviceName];
			return windowService || null;
		} catch {
			return null;
		}
	}

	private validateDownloadUrl(url: string): void {
		try {
			const urlObj = new URL(url);

			if (urlObj.protocol !== 'https:') {
				throw new Error(`Invalid protocol "${urlObj.protocol}". Only HTTPS downloads are allowed.`);
			}

			const hostname = urlObj.hostname;
			const privatePatterns = [
				/^localhost$/i,
				/^127\./,
				/^192\.168\./,
				/^10\./,
				/^172\.(1[6-9]|2\d|3[01])\./,
				/^::1$/,
				/^fc00:/,
				/^fd00:/,
			];

			if (privatePatterns.some((pattern) => pattern.test(hostname))) {
				throw new Error(`Downloads from private networks are not allowed: ${hostname}`);
			}
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(`Invalid URL format: ${url}`);
		}
	}

	private isValidOutputType(type: string): type is OutputType {
		return (VALID_OUTPUT_TYPES as readonly string[]).includes(type);
	}
}
