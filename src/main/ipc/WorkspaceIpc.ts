import { ipcMain, dialog } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { StoreService } from '../services/store'

/**
 * IPC handlers for workspace selection and management.
 *
 * NOTE: This module fixes the duplicate registration bug.
 * The WorkspaceSelector class should NOT register its own IPC handlers.
 * All workspace-related IPC handlers are centralized here.
 */
export class WorkspaceIpc implements IpcModule {
  readonly name = 'workspace'
  private currentWorkspace: string | null = null

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const storeService = container.get<StoreService>('store')

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

    // Get current workspace
    ipcMain.handle('workspace-get-current', () => {
      return this.currentWorkspace
    })

    // Set current workspace
    ipcMain.handle('workspace-set-current', (_event, workspacePath: string) => {
      console.log('[WorkspaceIpc] Setting current workspace:', workspacePath)
      this.currentWorkspace = workspacePath
      // Add to recent workspaces in store for persistence
      storeService.setCurrentWorkspace(workspacePath)
    })

    // Get recent workspaces
    ipcMain.handle('workspace-get-recent', () => {
      return storeService.getRecentWorkspaces()
    })

    // Clear current workspace
    ipcMain.handle('workspace-clear', () => {
      console.log('[WorkspaceIpc] Clearing current workspace')
      this.currentWorkspace = null
      storeService.clearCurrentWorkspace()
    })

    // Note: workspace:confirm and workspace:cancel handlers are still
    // registered in WorkspaceSelector because they're specific to that
    // window's lifecycle. The duplicate 'workspace:select-folder' is fixed.

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
