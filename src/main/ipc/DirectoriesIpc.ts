import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { WorkspaceMetadataService } from '../services/workspace-metadata'
import { wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'

/**
 * IPC handlers for indexed directory management.
 *
 * Thin routing layer -- all logic lives in WorkspaceMetadataService.
 * Uses wrapSimpleHandler for standardized error handling (IpcResult envelope).
 */
export class DirectoriesIpc implements IpcModule {
  readonly name = 'directories'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    // All handlers are now window-scoped to ensure workspace isolation

    // List all indexed directories (window-scoped)
    ipcMain.handle(
      'directories:list',
      wrapIpcHandler((event: IpcMainInvokeEvent) => {
        const metadata = getWindowService<WorkspaceMetadataService>(event, container, 'workspaceMetadata')
        return metadata.getDirectories()
      }, 'directories:list')
    )

    // Add a single directory (window-scoped)
    ipcMain.handle(
      'directories:add',
      wrapIpcHandler(
        (event: IpcMainInvokeEvent, dirPath: string) => {
          const metadata = getWindowService<WorkspaceMetadataService>(event, container, 'workspaceMetadata')
          return metadata.addDirectory(dirPath)
        },
        'directories:add'
      )
    )

    // Add multiple directories (window-scoped)
    ipcMain.handle(
      'directories:add-many',
      wrapIpcHandler(
        (event: IpcMainInvokeEvent, dirPaths: string[]) => {
          const metadata = getWindowService<WorkspaceMetadataService>(event, container, 'workspaceMetadata')
          return metadata.addDirectories(dirPaths)
        },
        'directories:add-many'
      )
    )

    // Remove a directory by ID (window-scoped)
    ipcMain.handle(
      'directories:remove',
      wrapIpcHandler(
        (event: IpcMainInvokeEvent, id: string) => {
          const metadata = getWindowService<WorkspaceMetadataService>(event, container, 'workspaceMetadata')
          return metadata.removeDirectory(id)
        },
        'directories:remove'
      )
    )

    // Validate a directory path (window-scoped)
    ipcMain.handle(
      'directories:validate',
      wrapIpcHandler(
        (event: IpcMainInvokeEvent, dirPath: string) => {
          const metadata = getWindowService<WorkspaceMetadataService>(event, container, 'workspaceMetadata')
          return metadata.validateDirectory(dirPath)
        },
        'directories:validate'
      )
    )

    // Mark a directory as indexed (window-scoped)
    ipcMain.handle(
      'directories:mark-indexed',
      wrapIpcHandler(
        (event: IpcMainInvokeEvent, id: string, isIndexed: boolean) => {
          const metadata = getWindowService<WorkspaceMetadataService>(event, container, 'workspaceMetadata')
          return metadata.markDirectoryIndexed(id, isIndexed)
        },
        'directories:mark-indexed'
      )
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
