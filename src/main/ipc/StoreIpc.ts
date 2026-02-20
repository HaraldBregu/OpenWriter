import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { StoreService, ModelSettings } from '../services/store'

/**
 * IPC handlers for settings/store operations.
 */
export class StoreIpc implements IpcModule {
  readonly name = 'store'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const store = container.get<StoreService>('store')

    // Model settings
    ipcMain.handle('store-get-model-settings', (_e, providerId: string) =>
      store.getModelSettings(providerId)
    )
    ipcMain.handle('store-get-all-model-settings', () => store.getAllModelSettings())
    ipcMain.handle('store-set-selected-model', (_e, providerId: string, modelId: string) =>
      store.setSelectedModel(providerId, modelId)
    )
    ipcMain.handle('store-set-api-token', (_e, providerId: string, token: string) =>
      store.setApiToken(providerId, token)
    )
    ipcMain.handle('store-set-model-settings', (_e, providerId: string, settings: ModelSettings) =>
      store.setModelSettings(providerId, settings)
    )

    // Workspace settings
    ipcMain.handle('store-get-current-workspace', () => store.getCurrentWorkspace())
    ipcMain.handle('store-set-current-workspace', (_e, workspacePath: string) =>
      store.setCurrentWorkspace(workspacePath)
    )
    ipcMain.handle('store-get-recent-workspaces', () => store.getRecentWorkspaces())
    ipcMain.handle('store-clear-current-workspace', () => store.clearCurrentWorkspace())

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
