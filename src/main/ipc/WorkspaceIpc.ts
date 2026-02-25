import { ipcMain, dialog } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import fs from 'node:fs'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { WorkspaceService } from '../services/workspace'
import type { LoggerService } from '../services/logger'
import { wrapSimpleHandler, wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'
import { PathValidator } from '../shared/PathValidator'

/**
 * IPC handlers for workspace management.
 *
 * This is a thin routing layer -- all state and logic live in WorkspaceService.
 * Each handler delegates to the service and lets the error wrapper handle failures.
 */
export class WorkspaceIpc implements IpcModule {
  readonly name = 'workspace'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const logger = container.get<LoggerService>('logger')

    // Workspace folder selection dialog (global, not window-specific)
    // Shows folder picker and returns the selected path
    ipcMain.handle(
      'workspace:select-folder',
      wrapSimpleHandler(async () => {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select Workspace Folder',
          buttonLabel: 'Select Workspace'
        })

        if (!result.canceled && result.filePaths.length > 0) {
          const workspacePath = result.filePaths[0]
          logger.info('WorkspaceIpc', `Folder selected: ${workspacePath}`)
          return workspacePath
        }
        return null
      }, 'workspace:select-folder')
    )

    // Get current workspace (window-scoped)
    ipcMain.handle(
      'workspace-get-current',
      wrapIpcHandler((event: IpcMainInvokeEvent) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        return workspace.getCurrent()
      }, 'workspace-get-current')
    )

    // Set current workspace (window-scoped)
    // Sets the workspace in the current window
    ipcMain.handle(
      'workspace-set-current',
      wrapIpcHandler((event: IpcMainInvokeEvent, workspacePath: string) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        logger.info('WorkspaceIpc', `Setting workspace: ${workspacePath}`)
        workspace.setCurrent(workspacePath)
      }, 'workspace-set-current')
    )

    // Get recent workspaces (window-scoped)
    ipcMain.handle(
      'workspace-get-recent',
      wrapIpcHandler((event: IpcMainInvokeEvent) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        return workspace.getRecent()
      }, 'workspace-get-recent')
    )

    // Clear current workspace (window-scoped)
    ipcMain.handle(
      'workspace-clear',
      wrapIpcHandler((event: IpcMainInvokeEvent) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        workspace.clear()
      }, 'workspace-clear')
    )

    // Check if a directory exists (global utility)
    ipcMain.handle(
      'workspace-directory-exists',
      wrapSimpleHandler((directoryPath: string) => {
        try {
          return fs.existsSync(directoryPath) && fs.statSync(directoryPath).isDirectory()
        } catch {
          return false
        }
      }, 'workspace-directory-exists')
    )

    // Remove workspace from recent history (window-scoped)
    ipcMain.handle(
      'workspace-remove-recent',
      wrapIpcHandler((event: IpcMainInvokeEvent, workspacePath: string) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        workspace.removeRecent(workspacePath)
        logger.info('WorkspaceIpc', `Removed from recent: ${workspacePath}`)
      }, 'workspace-remove-recent')
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
