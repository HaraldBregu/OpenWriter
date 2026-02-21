import { ipcMain, dialog } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { WorkspaceService } from '../services/workspace'
import { wrapSimpleHandler } from './IpcErrorHandler'

/**
 * IPC handlers for workspace management.
 *
 * This is a thin routing layer -- all state and logic live in WorkspaceService.
 * Each handler delegates to the service and lets the error wrapper handle failures.
 */
export class WorkspaceIpc implements IpcModule {
  readonly name = 'workspace'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const workspace = container.get<WorkspaceService>('workspace')

    // Workspace folder selection dialog
    ipcMain.handle(
      'workspace:select-folder',
      wrapSimpleHandler(async () => {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select Workspace Folder',
          buttonLabel: 'Select Workspace'
        })

        if (!result.canceled && result.filePaths.length > 0) {
          return result.filePaths[0]
        }
        return null
      }, 'workspace:select-folder')
    )

    // Get current workspace
    ipcMain.handle(
      'workspace-get-current',
      wrapSimpleHandler(() => workspace.getCurrent(), 'workspace-get-current')
    )

    // Set current workspace
    ipcMain.handle(
      'workspace-set-current',
      wrapSimpleHandler((workspacePath: string) => {
        workspace.setCurrent(workspacePath)
      }, 'workspace-set-current')
    )

    // Get recent workspaces
    ipcMain.handle(
      'workspace-get-recent',
      wrapSimpleHandler(() => workspace.getRecent(), 'workspace-get-recent')
    )

    // Clear current workspace
    ipcMain.handle(
      'workspace-clear',
      wrapSimpleHandler(() => {
        workspace.clear()
      }, 'workspace-clear')
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
