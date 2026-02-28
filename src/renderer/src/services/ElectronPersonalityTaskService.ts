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

    // 'text-completer' is the general-purpose chat agent used by the personality
    // system.  agentId is required by AIAgentTaskHandler.validate() — omitting it
    // causes the handler to throw before the task is queued.
    //
    // Note: TextCompleter builds its own system prompts inside the LangGraph graph
    // and does NOT read systemPrompt or messages from the task input.  Those fields
    // are part of PersonalitySubmitInput for future extensibility but are not
    // forwarded here to keep the IPC payload minimal and match AIAgentTaskInput.
    const payload: Record<string, unknown> = {
      agentId: 'text-completer',
      prompt: input.prompt,
      providerId: input.providerId,
    }
    if (input.modelId) payload.modelId = input.modelId

    // Map flat temperature/maxTokens into the overrides object that
    // AIAgentTaskHandler.execute() reads from input.overrides.
    const overrides: Record<string, unknown> = {}
    if (input.temperature !== undefined) overrides.temperature = input.temperature
    if (input.maxTokens != null) overrides.maxTokens = input.maxTokens
    if (Object.keys(overrides).length > 0) payload.overrides = overrides

    // Non-null assertion is safe here: assertBridge() throws if window.tasksManager is undefined.
    const result = await window.tasksManager!.submit('ai-agent', payload)
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
