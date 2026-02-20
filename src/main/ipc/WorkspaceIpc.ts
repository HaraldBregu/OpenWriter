import { ipcMain, dialog } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { StoreService } from '../services/store'
import { wrapSimpleHandler } from './IpcErrorHandler'

/**
 * IPC handlers for workspace management.
 * All workspace-related IPC handlers are centralized here.
 */
export class WorkspaceIpc implements IpcModule {
  readonly name = 'workspace'
  private currentWorkspace: string | null = null

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const storeService = container.get<StoreService>('store')

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
      wrapSimpleHandler(() => this.currentWorkspace, 'workspace-get-current')
    )

    // Set current workspace
    ipcMain.handle(
      'workspace-set-current',
      wrapSimpleHandler((workspacePath: string) => {
        console.log('[WorkspaceIpc] Setting current workspace:', workspacePath)
        this.currentWorkspace = workspacePath
        // Add to recent workspaces in store for persistence
        storeService.setCurrentWorkspace(workspacePath)
      }, 'workspace-set-current')
    )

    // Get recent workspaces
    ipcMain.handle(
      'workspace-get-recent',
      wrapSimpleHandler(() => storeService.getRecentWorkspaces(), 'workspace-get-recent')
    )

    // Clear current workspace
    ipcMain.handle(
      'workspace-clear',
      wrapSimpleHandler(() => {
        console.log('[WorkspaceIpc] Clearing current workspace')
        this.currentWorkspace = null
        storeService.clearCurrentWorkspace()
      }, 'workspace-clear')
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
