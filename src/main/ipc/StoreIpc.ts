import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { StoreService } from '../services/store'
import type { ProviderSettings, InferenceDefaultsUpdate } from '../../shared/types/aiSettings'
import { StoreValidators } from '../shared/validators'
import { wrapSimpleHandler } from './IpcErrorHandler'
import { StoreChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for settings/store operations.
 */
export class StoreIpc implements IpcModule {
  readonly name = 'store'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const store = container.get<StoreService>('store')

    // --- New provider settings channels ---

    ipcMain.handle(
      StoreChannels.getAllProviderSettings,
      wrapSimpleHandler(() => store.getAllProviderSettings(), StoreChannels.getAllProviderSettings)
    )

    ipcMain.handle(
      StoreChannels.getProviderSettings,
      wrapSimpleHandler((providerId: string) => {
        StoreValidators.validateProviderId(providerId)
        return store.getProviderSettings(providerId)
      }, StoreChannels.getProviderSettings)
    )

    ipcMain.handle(
      StoreChannels.setProviderSettings,
      wrapSimpleHandler((providerId: string, settings: ProviderSettings) => {
        StoreValidators.validateProviderId(providerId)
        StoreValidators.validateModelName(settings.selectedModel)
        StoreValidators.validateApiToken(settings.apiToken)
        StoreValidators.validateTemperature(settings.temperature)
        StoreValidators.validateMaxTokens(settings.maxTokens)
        StoreValidators.validateReasoning(settings.reasoning)
        return store.setProviderSettings(providerId, settings)
      }, StoreChannels.setProviderSettings)
    )

    ipcMain.handle(
      StoreChannels.setInferenceDefaults,
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
      }, StoreChannels.setInferenceDefaults)
    )

    // --- Legacy model settings channels ---

    ipcMain.handle(
      StoreChannels.getModelSettings,
      wrapSimpleHandler((providerId: string) => {
        StoreValidators.validateProviderId(providerId)
        return store.getModelSettings(providerId)
      }, StoreChannels.getModelSettings)
    )
    ipcMain.handle(
      StoreChannels.getAllModelSettings,
      wrapSimpleHandler(() => store.getAllModelSettings(), StoreChannels.getAllModelSettings)
    )
    ipcMain.handle(
      StoreChannels.setSelectedModel,
      wrapSimpleHandler((providerId: string, modelId: string) => {
        StoreValidators.validateProviderId(providerId)
        StoreValidators.validateModelName(modelId)
        return store.setSelectedModel(providerId, modelId)
      }, StoreChannels.setSelectedModel)
    )
    ipcMain.handle(
      StoreChannels.setApiToken,
      wrapSimpleHandler((providerId: string, token: string) => {
        StoreValidators.validateProviderId(providerId)
        StoreValidators.validateApiToken(token)
        return store.setApiToken(providerId, token)
      }, StoreChannels.setApiToken)
    )
    ipcMain.handle(
      StoreChannels.setModelSettings,
      wrapSimpleHandler((providerId: string, settings: ProviderSettings) => {
        StoreValidators.validateProviderId(providerId)
        return store.setModelSettings(providerId, settings)
      }, StoreChannels.setModelSettings)
    )

    // --- Workspace settings channels ---

    ipcMain.handle(
      StoreChannels.getCurrentWorkspace,
      wrapSimpleHandler(() => store.getCurrentWorkspace(), StoreChannels.getCurrentWorkspace)
    )
    ipcMain.handle(
      StoreChannels.setCurrentWorkspace,
      wrapSimpleHandler(
        (workspacePath: string) => store.setCurrentWorkspace(workspacePath),
        StoreChannels.setCurrentWorkspace
      )
    )
    ipcMain.handle(
      StoreChannels.getRecentWorkspaces,
      wrapSimpleHandler(() => store.getRecentWorkspaces(), StoreChannels.getRecentWorkspaces)
    )
    ipcMain.handle(
      StoreChannels.clearCurrentWorkspace,
      wrapSimpleHandler(() => store.clearCurrentWorkspace(), StoreChannels.clearCurrentWorkspace)
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
