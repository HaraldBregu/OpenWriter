import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { IpcModule } from './IpcModule';
import type { ServiceContainer } from '../core/ServiceContainer';
import type { EventBus } from '../core/EventBus';
import type { LoggerService } from '../services/logger';
import type { WorkspaceService } from '../services/workspace';
import { FileSystemManager } from '../shared/FileSystemManager';
import { wrapIpcHandler } from './IpcErrorHandler';
import { getWindowService } from './IpcHelpers';
import { FsChannels } from '../../shared/channels';
import type {
	FsReadFileParams,
	FsWriteFileParams,
	FsCreateFileParams,
	FsCreateFolderParams,
	FsRenameParams,
	FsRenameResult,
} from '../../shared/types';

/**
 * IPC handlers for sandboxed filesystem operations.
 *
 * ### Security model
 * Every handler resolves the current window's workspace path and passes it
 * to {@link FileSystemManager} as an extra trusted root, alongside the four
 * standard Electron directories (Documents, Downloads, Desktop, userData)
 * already enforced by `PathValidator`.
 *
 * Paths are validated *inside* `FileSystemManager` — not by the IPC handler —
 * so validation is always applied regardless of how the manager is called.
 *
 * ### IPC contract
 * All handlers are registered via `ipcMain.handle` / `wrapIpcHandler` so they
 * participate in the standard `IpcResult<T>` envelope. The preload script
 * unwraps the envelope with `typedInvokeUnwrap`.
 *
 * ### Channel names
 * See {@link FsChannels} in `src/shared/channels.ts`.
 *
 * @see FileSystemManager
 * @see PathValidator
 */
export class FileSystemIpc implements IpcModule {
	readonly name = 'fs';

	register(container: ServiceContainer, _eventBus: EventBus): void {
		const logger = container.get<LoggerService>('logger');

		// -----------------------------------------------------------------
		// fs:read-file
		// -----------------------------------------------------------------

		ipcMain.handle(
			FsChannels.readFile,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, params: FsReadFileParams) => {
				this.validateParams(params, ['filePath']);
				const manager = this.buildManager(event, container, logger);
				return manager.readFile(params.filePath, { encoding: params.encoding });
			}, FsChannels.readFile)
		);

		// -----------------------------------------------------------------
		// fs:write-file
		// -----------------------------------------------------------------

		ipcMain.handle(
			FsChannels.writeFile,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, params: FsWriteFileParams) => {
				this.validateParams(params, ['filePath', 'content']);
				if (typeof params.content !== 'string') {
					throw new Error('fs:write-file: content must be a string');
				}
				const manager = this.buildManager(event, container, logger);
				await manager.writeFile(params.filePath, params.content, {
					encoding: params.encoding,
					atomic: params.atomic,
					createParents: params.createParents,
				});
			}, FsChannels.writeFile)
		);

		// -----------------------------------------------------------------
		// fs:create-file
		// -----------------------------------------------------------------

		ipcMain.handle(
			FsChannels.createFile,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, params: FsCreateFileParams) => {
				this.validateParams(params, ['filePath']);
				if (params.content !== undefined && typeof params.content !== 'string') {
					throw new Error('fs:create-file: content must be a string when provided');
				}
				const manager = this.buildManager(event, container, logger);
				await manager.createFile(params.filePath, {
					content: params.content,
					encoding: params.encoding,
					failIfExists: params.failIfExists,
					createParents: params.createParents,
				});
			}, FsChannels.createFile)
		);

		// -----------------------------------------------------------------
		// fs:create-folder
		// -----------------------------------------------------------------

		ipcMain.handle(
			FsChannels.createFolder,
			wrapIpcHandler(async (event: IpcMainInvokeEvent, params: FsCreateFolderParams) => {
				this.validateParams(params, ['folderPath']);
				const manager = this.buildManager(event, container, logger);
				await manager.createFolder(params.folderPath, {
					recursive: params.recursive,
					failIfExists: params.failIfExists,
				});
			}, FsChannels.createFolder)
		);

		// -----------------------------------------------------------------
		// fs:rename
		// -----------------------------------------------------------------

		ipcMain.handle(
			FsChannels.rename,
			wrapIpcHandler(
				async (event: IpcMainInvokeEvent, params: FsRenameParams): Promise<FsRenameResult> => {
					this.validateParams(params, ['oldPath', 'newPath']);
					const manager = this.buildManager(event, container, logger);
					return manager.renameEntry(params.oldPath, params.newPath, {
						failIfExists: params.failIfExists,
					});
				},
				FsChannels.rename
			)
		);

		logger.info('FileSystemIpc', `Registered ${this.name} IPC module`);
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	/**
	 * Construct a {@link FileSystemManager} configured with the current window's
	 * workspace path as an extra trusted root (in addition to the four standard
	 * Electron paths already covered by `PathValidator`).
	 *
	 * If the window has no workspace set yet, only the standard Electron paths
	 * are allowed. This is intentional: the renderer should not be performing
	 * filesystem operations before a workspace is selected.
	 */
	private buildManager(
		event: IpcMainInvokeEvent,
		container: ServiceContainer,
		logger: LoggerService
	): FileSystemManager {
		const extraRoots: string[] = [];

		try {
			const workspace = getWindowService<WorkspaceService>(event, container, 'workspace');
			const workspacePath = workspace.getCurrent();
			if (workspacePath) {
				extraRoots.push(workspacePath);
			}
		} catch {
			// No window context or no workspace — operate with the static allowlist only.
			logger.debug(
				'FileSystemIpc',
				'No workspace path available; filesystem operations restricted to Electron standard paths'
			);
		}

		return new FileSystemManager(logger, extraRoots);
	}

	/**
	 * Validate that `params` is a plain object and contains all `required` keys
	 * as non-empty strings.
	 *
	 * This is the first line of defence against malformed IPC payloads; the
	 * `FileSystemManager` performs deeper semantic validation (path safety,
	 * name validity, size limits, etc.).
	 */
	private validateParams(params: unknown, required: string[]): void {
		if (params === null || typeof params !== 'object' || Array.isArray(params)) {
			throw new Error('Invalid payload: expected a plain object');
		}

		const record = params as Record<string, unknown>;

		for (const key of required) {
			const value = record[key];
			if (typeof value !== 'string' || value.trim().length === 0) {
				throw new Error(`Invalid payload: "${key}" must be a non-empty string`);
			}
		}
	}
}
