/**
 * ElectronPersonalityTaskService (refactored)
 *
 * Production implementation of IPersonalityTaskService — the Personality
 * domain's narrowing of IEntityTaskService.
 *
 * This class is now purely a bridge from the generic interface to the
 * concrete window.* IPC calls.  All state management, event routing, and
 * business logic live in EntityTaskContext / createEntityTaskContext().
 *
 * The only code here is the four IPC bridge methods the service must provide.
 */

import type {
  IPersonalityTaskService,
  PersonalitySubmitInput,
  PersonalitySubmitResult,
  PersonalitySaveOptions,
  PersonalitySaveResult,
} from '@/contexts/PersonalityTaskContext.refactored'
import type { EntityTaskIpcResult } from '@/services/IEntityTaskService'

export class ElectronPersonalityTaskService implements IPersonalityTaskService {
  private assertTaskBridge(): void {
    if (!window.task) {
      throw new Error(
        '[ElectronPersonalityTaskService] window.task is undefined. ' +
        'Ensure the BrowserWindow has the preload script configured, or ' +
        'inject a mock service via <PersonalityTaskProvider service={...}>.',
      )
    }
  }

  async submitTask(
    input: PersonalitySubmitInput,
  ): Promise<EntityTaskIpcResult<PersonalitySubmitResult>> {
    this.assertTaskBridge()

    const payload: Record<string, unknown> = {
      prompt: input.prompt,
      providerId: input.providerId,
      systemPrompt: input.systemPrompt,
      messages: input.messages,
    }
    if (input.modelId) payload.modelId = input.modelId
    if (input.temperature !== undefined) payload.temperature = input.temperature
    if (input.maxTokens) payload.maxTokens = input.maxTokens

    // window.task.submit returns the IPC result envelope directly.
    const result = await window.task!.submit('ai-chat', payload)
    return result as EntityTaskIpcResult<PersonalitySubmitResult>
  }

  cancelTask(taskId: string): void {
    window.task?.cancel(taskId)
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

/** Singleton shared for the lifetime of the app. */
export const electronPersonalityTaskService = new ElectronPersonalityTaskService()
