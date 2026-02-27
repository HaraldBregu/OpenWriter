import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { WorkspaceMetadataService } from '../services/workspace-metadata'
import { wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'
import { WorkspaceChannels } from '../../shared/types/ipc/channels'

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
      WorkspaceChannels.list,
      wrapIpcHandler((event: IpcMainInvokeEvent) => {
        const metadata = getWindowService<WorkspaceMetadataService>(event, container, 'workspaceMetadata')
        return metadata.getDirectories()
      }, WorkspaceChannels.list)
    )

    // Add a single directory (window-scoped)
    ipcMain.handle(
      WorkspaceChannels.add,
      wrapIpcHandler(
        (event: IpcMainInvokeEvent, dirPath: string) => {
          const metadata = getWindowService<WorkspaceMetadataService>(event, container, 'workspaceMetadata')
          return metadata.addDirectory(dirPath)
        },
        WorkspaceChannels.add
      )
    )

    // Add multiple directories (window-scoped)
    ipcMain.handle(
      WorkspaceChannels.addMany,
      wrapIpcHandler(
        (event: IpcMainInvokeEvent, dirPaths: string[]) => {
          const metadata = getWindowService<WorkspaceMetadataService>(event, container, 'workspaceMetadata')
          return metadata.addDirectories(dirPaths)
        },
        WorkspaceChannels.addMany
      )
    )

    // Remove a directory by ID (window-scoped)
    ipcMain.handle(
      WorkspaceChannels.remove,
      wrapIpcHandler(
        (event: IpcMainInvokeEvent, id: string) => {
          const metadata = getWindowService<WorkspaceMetadataService>(event, container, 'workspaceMetadata')
          return metadata.removeDirectory(id)
        },
        WorkspaceChannels.remove
      )
    )

    // Validate a directory path (window-scoped)
    ipcMain.handle(
      WorkspaceChannels.validate,
      wrapIpcHandler(
        (event: IpcMainInvokeEvent, dirPath: string) => {
          const metadata = getWindowService<WorkspaceMetadataService>(event, container, 'workspaceMetadata')
          return metadata.validateDirectory(dirPath)
        },
        WorkspaceChannels.validate
      )
    )

    // Mark a directory as indexed (window-scoped)
    ipcMain.handle(
      WorkspaceChannels.markIndexed,
      wrapIpcHandler(
        (event: IpcMainInvokeEvent, id: string, isIndexed: boolean) => {
          const metadata = getWindowService<WorkspaceMetadataService>(event, container, 'workspaceMetadata')
          return metadata.markDirectoryIndexed(id, isIndexed)
        },
        WorkspaceChannels.markIndexed
      )
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
