import { ipcMain, dialog } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { WorkspaceService } from '../services/workspace'
import type { LoggerService } from '../services/logger'
import { wrapSimpleHandler, wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'
import { WorkspaceProcessManager } from '../workspace-process'

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
    const workspaceProcessManager = new WorkspaceProcessManager(logger)

    // Workspace folder selection dialog (global, not window-specific)
    // When a folder is selected, spawn a new Electron process for that workspace
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

          // Spawn a separate Electron process for this workspace
          // This provides complete isolation - separate main process, memory, services
          logger.info('WorkspaceIpc', `Spawning separate process for workspace: ${workspacePath}`)
          const pid = workspaceProcessManager.spawnWorkspaceProcess({
            workspacePath,
            logger
          })

          logger.info('WorkspaceIpc', `Workspace process spawned with PID: ${pid}`)

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
    ipcMain.handle(
      'workspace-set-current',
      wrapIpcHandler((event: IpcMainInvokeEvent, workspacePath: string) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
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

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
