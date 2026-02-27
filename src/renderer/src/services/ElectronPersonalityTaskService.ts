import type {
  IPersonalityTaskService,
  SavePersonalityOptions,
  SavePersonalityResult,
  SubmitTaskInput,
  SubmitTaskResult,
  SubmitTaskError,
} from './IPersonalityTaskService'

/**
 * Production implementation of IPersonalityTaskService.
 *
 * Delegates every call to the Electron IPC bridge exposed on `window`.
 * This is the only file in the renderer that is allowed to reference
 * window.task, window.app, and window.workspace directly.
 *
 * DIP: PersonalityTaskContext imports IPersonalityTaskService, not this class.
 * App.tsx instantiates this class and passes it to PersonalityTaskProvider.
 */
export class ElectronPersonalityTaskService implements IPersonalityTaskService {
  /**
   * Asserts that the Electron IPC bridge for the `task` namespace is available.
   * window.task is injected by the preload script via contextBridge.exposeInMainWorld.
   * If it is undefined the renderer is running in a window that was opened without
   * the preload, or in a non-Electron environment (tests, storybook) without a mock.
   */
  private assertBridge(): void {
    if (!window.task) {
      throw new Error(
        '[ElectronPersonalityTaskService] window.task is undefined. ' +
        'Ensure the BrowserWindow that renders this page has the preload script ' +
        'configured, or inject a MockPersonalityTaskService via PersonalityTaskProvider.'
      )
    }
  }

  async submitTask(input: SubmitTaskInput): Promise<SubmitTaskResult | SubmitTaskError> {
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

    // Non-null assertion is safe here: assertBridge() throws if window.task is undefined.
    const result = await window.task!.submit('ai-chat', payload)
    // window.task.submit returns { success, data } | { success: false, error }
    return result as SubmitTaskResult | SubmitTaskError
  }

  cancelTask(taskId: string): void {
    if (!window.task) return
    window.task.cancel(taskId)
  }

  async getModelSettings(providerId: string): Promise<{ selectedModel?: string } | null> {
    try {
      return await window.app.getModelSettings(providerId)
    } catch {
      return null
    }
  }

  async savePersonality(options: SavePersonalityOptions): Promise<SavePersonalityResult> {
    return window.workspace.savePersonality(options)
  }
}

/** Singleton — one instance shared for the lifetime of the app. */
export const electronPersonalityTaskService = new ElectronPersonalityTaskService()
