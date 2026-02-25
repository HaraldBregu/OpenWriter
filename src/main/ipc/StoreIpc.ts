import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { StoreService } from '../services/store'
import type { ProviderSettings, InferenceDefaultsUpdate } from '../../shared/types/aiSettings'
import { StoreValidators } from '../shared/validators'
import { wrapSimpleHandler } from './IpcErrorHandler'

/**
 * IPC handlers for settings/store operations.
 */
export class StoreIpc implements IpcModule {
  readonly name = 'store'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const store = container.get<StoreService>('store')

    // --- New provider settings channels ---

    ipcMain.handle(
      'store-get-all-provider-settings',
      wrapSimpleHandler(() => store.getAllProviderSettings(), 'store-get-all-provider-settings')
    )

    ipcMain.handle(
      'store-get-provider-settings',
      wrapSimpleHandler((providerId: string) => {
        StoreValidators.validateProviderId(providerId)
        return store.getProviderSettings(providerId)
      }, 'store-get-provider-settings')
    )

    ipcMain.handle(
      'store-set-provider-settings',
      wrapSimpleHandler((providerId: string, settings: ProviderSettings) => {
        StoreValidators.validateProviderId(providerId)
        StoreValidators.validateModelName(settings.selectedModel)
        StoreValidators.validateApiToken(settings.apiToken)
        StoreValidators.validateTemperature(settings.temperature)
        StoreValidators.validateMaxTokens(settings.maxTokens)
        StoreValidators.validateReasoning(settings.reasoning)
        return store.setProviderSettings(providerId, settings)
      }, 'store-set-provider-settings')
    )

    ipcMain.handle(
      'store-set-inference-defaults',
      wrapSimpleHandler((providerId: string, update: InferenceDefaultsUpdate) => {
        StoreValidators.validateProviderId(providerId)
        if (update.temperature !== undefined) {
          StoreValidators.validateTemperature(update.temperature)
        }
        if (update.maxTokens !== undefined) {
          StoreValidators.validateMaxTokens(update.maxTokens)
        }
        if (update.reasoning !== undefined) {
          StoreValidators.validateReasoning(update.reasoning)
        }
        return store.setInferenceDefaults(providerId, update)
      }, 'store-set-inference-defaults')
    )

    // --- Legacy model settings channels ---

    ipcMain.handle(
      'store-get-model-settings',
      wrapSimpleHandler((providerId: string) => {
        StoreValidators.validateProviderId(providerId)
        return store.getModelSettings(providerId)
      }, 'store-get-model-settings')
    )
    ipcMain.handle(
      'store-get-all-model-settings',
      wrapSimpleHandler(() => store.getAllModelSettings(), 'store-get-all-model-settings')
    )
    ipcMain.handle(
      'store-set-selected-model',
      wrapSimpleHandler((providerId: string, modelId: string) => {
        StoreValidators.validateProviderId(providerId)
        StoreValidators.validateModelName(modelId)
        return store.setSelectedModel(providerId, modelId)
      }, 'store-set-selected-model')
    )
    ipcMain.handle(
      'store-set-api-token',
      wrapSimpleHandler((providerId: string, token: string) => {
        StoreValidators.validateProviderId(providerId)
        StoreValidators.validateApiToken(token)
        return store.setApiToken(providerId, token)
      }, 'store-set-api-token')
    )
    ipcMain.handle(
      'store-set-model-settings',
      wrapSimpleHandler((providerId: string, settings: ProviderSettings) => {
        StoreValidators.validateProviderId(providerId)
        return store.setModelSettings(providerId, settings)
      }, 'store-set-model-settings')
    )

    // --- Workspace settings channels ---

    ipcMain.handle(
      'store-get-current-workspace',
      wrapSimpleHandler(() => store.getCurrentWorkspace(), 'store-get-current-workspace')
    )
    ipcMain.handle(
      'store-set-current-workspace',
      wrapSimpleHandler(
        (workspacePath: string) => store.setCurrentWorkspace(workspacePath),
        'store-set-current-workspace'
      )
    )
    ipcMain.handle(
      'store-get-recent-workspaces',
      wrapSimpleHandler(() => store.getRecentWorkspaces(), 'store-get-recent-workspaces')
    )
    ipcMain.handle(
      'store-clear-current-workspace',
      wrapSimpleHandler(() => store.clearCurrentWorkspace(), 'store-clear-current-workspace')
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
