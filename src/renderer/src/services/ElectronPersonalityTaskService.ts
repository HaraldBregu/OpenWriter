import type {
  IPersonalityTaskService,
  SavePersonalityOptions,
  SavePersonalityResult,
  SubmitTaskInput,
  SubmitTaskResult,
  SubmitTaskError,
  TaskEvent,
} from './IPersonalityTaskService'

/**
 * Production implementation of IPersonalityTaskService.
 *
 * Delegates every call to the Electron IPC bridge exposed on `window`.
 * This is the only file in the renderer that is allowed to reference
 * window.task, window.personality, and window.store directly.
 *
 * DIP: PersonalityTaskContext imports IPersonalityTaskService, not this class.
 * App.tsx instantiates this class and passes it to PersonalityTaskProvider.
 */
export class ElectronPersonalityTaskService implements IPersonalityTaskService {
  onTaskEvent(handler: (event: TaskEvent) => void): () => void {
    return window.task.onEvent((raw) => {
      handler({
        type: raw.type as TaskEvent['type'],
        data: raw.data as Record<string, unknown>,
      })
    })
  }

  async submitTask(input: SubmitTaskInput): Promise<SubmitTaskResult | SubmitTaskError> {
    const payload: Record<string, unknown> = {
      prompt: input.prompt,
      providerId: input.providerId,
      systemPrompt: input.systemPrompt,
      messages: input.messages,
    }
    if (input.modelId) payload.modelId = input.modelId
    if (input.temperature !== undefined) payload.temperature = input.temperature
    if (input.maxTokens) payload.maxTokens = input.maxTokens

    const result = await window.task.submit('ai-chat', payload)
    // window.task.submit returns { success, data } | { success: false, error }
    return result as SubmitTaskResult | SubmitTaskError
  }

  cancelTask(taskId: string): void {
    window.task.cancel(taskId)
  }

  async getModelSettings(providerId: string): Promise<{ selectedModel?: string } | null> {
    try {
      return await window.store.getModelSettings(providerId)
    } catch {
      return null
    }
  }

  async savePersonality(options: SavePersonalityOptions): Promise<SavePersonalityResult> {
    return window.personality.save(options)
  }
}

/** Singleton — one instance shared for the lifetime of the app. */
export const electronPersonalityTaskService = new ElectronPersonalityTaskService()
