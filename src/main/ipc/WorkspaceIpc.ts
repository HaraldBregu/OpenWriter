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
import { WorkspaceChannels } from '../../shared/types/ipc/channels'

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
      WorkspaceChannels.selectFolder,
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
      }, WorkspaceChannels.selectFolder)
    )

    // Get current workspace (window-scoped)
    ipcMain.handle(
      WorkspaceChannels.getCurrent,
      wrapIpcHandler((event: IpcMainInvokeEvent) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        return workspace.getCurrent()
      }, WorkspaceChannels.getCurrent)
    )

    // Set current workspace (window-scoped)
    // Sets the workspace in the current window
    ipcMain.handle(
      WorkspaceChannels.setCurrent,
      wrapIpcHandler((event: IpcMainInvokeEvent, workspacePath: string) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        logger.info('WorkspaceIpc', `Setting workspace: ${workspacePath}`)
        workspace.setCurrent(workspacePath)
      }, WorkspaceChannels.setCurrent)
    )

    // Get recent workspaces (window-scoped)
    ipcMain.handle(
      WorkspaceChannels.getRecent,
      wrapIpcHandler((event: IpcMainInvokeEvent) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        return workspace.getRecent()
      }, WorkspaceChannels.getRecent)
    )

    // Clear current workspace (window-scoped)
    ipcMain.handle(
      WorkspaceChannels.clear,
      wrapIpcHandler((event: IpcMainInvokeEvent) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        workspace.clear()
      }, WorkspaceChannels.clear)
    )

    // Check if a directory exists (global utility, read-only boolean check)
    ipcMain.handle(
      WorkspaceChannels.directoryExists,
      wrapSimpleHandler((directoryPath: string) => {
        try {
          return fs.existsSync(directoryPath) && fs.statSync(directoryPath).isDirectory()
        } catch {
          return false
        }
      }, WorkspaceChannels.directoryExists)
    )

    // Remove workspace from recent history (window-scoped)
    ipcMain.handle(
      WorkspaceChannels.removeRecent,
      wrapIpcHandler((event: IpcMainInvokeEvent, workspacePath: string) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        workspace.removeRecent(workspacePath)
        logger.info('WorkspaceIpc', `Removed from recent: ${workspacePath}`)
      }, WorkspaceChannels.removeRecent)
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
