import { ipcMain, dialog } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'

/**
 * IPC handlers for workspace selection.
 *
 * NOTE: This module fixes the duplicate registration bug.
 * The WorkspaceSelector class should NOT register its own IPC handlers.
 * All workspace-related IPC handlers are centralized here.
 */
export class WorkspaceIpc implements IpcModule {
  readonly name = 'workspace'

  register(_container: ServiceContainer, _eventBus: EventBus): void {
    // Workspace folder selection dialog
    ipcMain.handle('workspace:select-folder', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Workspace Folder',
        buttonLabel: 'Select Workspace'
      })

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
      }
      return null
    })

    // Note: workspace:confirm and workspace:cancel handlers are still
    // registered in WorkspaceSelector because they're specific to that
    // window's lifecycle. The duplicate 'workspace:select-folder' is fixed.

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
