import type {
  IPersonalityTaskService,
  PersonalitySubmitInput,
  PersonalitySubmitResult,
  PersonalitySaveOptions,
  PersonalitySaveResult,
} from '@/contexts/PersonalityTaskContext'
import type { EntityTaskIpcResult } from '@/services/IEntityTaskService'

/**
 * Production implementation of IPersonalityTaskService.
 *
 * Delegates every call to the Electron IPC bridge exposed on `window`.
 * This is the only file in the renderer that is allowed to reference
 * window.tasksManager, window.app, and window.workspace directly.
 *
 * DIP: PersonalityTaskContext imports IPersonalityTaskService, not this class.
 * App.tsx instantiates this class and passes it to PersonalityTaskProvider.
 */
export class ElectronPersonalityTaskService implements IPersonalityTaskService {
  /**
   * Asserts that the Electron IPC bridge for the `task` namespace is available.
   * window.tasksManager is injected by the preload script via contextBridge.exposeInMainWorld.
   * If it is undefined the renderer is running in a window that was opened without
   * the preload, or in a non-Electron environment (tests, storybook) without a mock.
   */
  private assertBridge(): void {
    if (!window.tasksManager) {
      throw new Error(
        '[ElectronPersonalityTaskService] window.tasksManager is undefined. ' +
        'Ensure the BrowserWindow has the preload script configured, or ' +
        'inject a mock service via <PersonalityTaskProvider service={...}>.',
      )
    }
  }

  async submitTask(
    input: PersonalitySubmitInput,
  ): Promise<EntityTaskIpcResult<PersonalitySubmitResult>> {
    this.assertBridge()
    const payload: Record<string, unknown> = {
      prompt: input.prompt,
      providerId: input.providerId,
      systemPrompt: input.systemPrompt,
      messages: input.messages,
    }
    if (input.modelId) payload.modelId = input.modelId
    if (input.temperature !== undefined) payload.temperature = input.temperature
    if (input.maxTokens) payload.maxTokens = input.maxTokens

    // Non-null assertion is safe here: assertBridge() throws if window.tasksManager is undefined.
    const result = await window.tasksManager!.submit('ai-chat', payload)
    return result as EntityTaskIpcResult<PersonalitySubmitResult>
  }

  cancelTask(taskId: string): void {
    window.tasksManager?.cancel(taskId)
  }

  async getModelSettings(providerId: string): Promise<{ selectedModel?: string } | null> {
    try {
      return await window.app.getModelSettings(providerId)
    } catch {
      return null
    }
  }

  async save(options: PersonalitySaveOptions): Promise<PersonalitySaveResult> {
    return window.workspace.savePersonality(options)
  }
}

/** Singleton — one instance shared for the lifetime of the app. */
export const electronPersonalityTaskService = new ElectronPersonalityTaskService()
