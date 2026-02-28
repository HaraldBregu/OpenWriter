import type { EntityTaskIpcResult, EntityTaskSaveResult } from '@/services/IEntityTaskService'
import type { IEntityTaskService } from '@/services/IEntityTaskService'

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * Input payload for submitting a generic AI agent task.
 *
 * `agentId` must match a registered agent id in AIAgentsRegistry
 * (e.g. 'story-writer', 'text-completer', 'content-review',
 *       'summarizer', 'tone-adjuster').
 */
export interface AIAgentSubmitInput {
  readonly agentId: string
  readonly prompt: string
  readonly providerId: string
  readonly modelId?: string | null
  readonly temperature?: number
  readonly maxTokens?: number | null
}

export interface AIAgentSubmitResult {
  readonly taskId: string
}

/**
 * Minimal save result that satisfies the EntityTaskSaveResult constraint.
 * Generic AI agent tasks do not have a persistence operation — callers that
 * need saving should use a domain-specific service.
 */
export interface AIAgentNoSaveResult extends EntityTaskSaveResult {
  readonly id: string
}

// ---------------------------------------------------------------------------
// Service type alias — constrains the four generic parameters
// ---------------------------------------------------------------------------

export type IAIAgentTaskService = IEntityTaskService<
  AIAgentSubmitInput,
  AIAgentSubmitResult,
  never,
  AIAgentNoSaveResult
>

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * ElectronAIAgentTaskService — production implementation of IAIAgentTaskService.
 *
 * Provides a typed IPC bridge for any agent registered in AIAgentsRegistry.
 * The `agentId` is bound at construction time so a single instance is dedicated
 * to one agent type; construct multiple instances (via the factory below) when
 * running different agents in the same renderer.
 *
 * DIP: consumers depend on IAIAgentTaskService, not on this class.
 * Inject via the context provider; never import this class directly in UI code.
 *
 * IPC flow:
 *   submitTask()  →  window.tasksManager.submit('ai-agent', { agentId, prompt, … })
 *                 →  TasksManager queues the task
 *                 →  AIAgentTaskHandler.validate() checks agentId + prompt
 *                 →  AIAgentTaskHandler.execute() streams tokens back via onEvent
 */
export class ElectronAIAgentTaskService implements IAIAgentTaskService {
  constructor(private readonly agentId: string) {}

  /**
   * Asserts that the Electron IPC bridge for the `tasksManager` namespace is
   * available.  window.tasksManager is injected by the preload script via
   * contextBridge.exposeInMainWorld.  If it is undefined the renderer is running
   * in a window that was opened without the preload, or in a non-Electron
   * environment (tests, Storybook) without a mock.
   */
  private assertBridge(): void {
    if (!window.tasksManager) {
      throw new Error(
        `[ElectronAIAgentTaskService] window.tasksManager is undefined. ` +
        `Ensure the BrowserWindow has the preload script configured, or ` +
        `inject a mock service via the relevant context provider.`,
      )
    }
  }

  async submitTask(
    input: AIAgentSubmitInput,
  ): Promise<EntityTaskIpcResult<AIAgentSubmitResult>> {
    this.assertBridge()

    // Build the payload for AIAgentTaskHandler.validate():
    //   required: agentId, prompt, providerId
    //   optional: modelId, overrides (temperature, maxTokens)
    const payload: Record<string, unknown> = {
      agentId: this.agentId,
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
    return result as EntityTaskIpcResult<AIAgentSubmitResult>
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

  /**
   * Generic AI agent tasks do not have a persistence layer in the base service.
   * Domain-specific subclasses or wrapper services should override this method
   * if the task output needs to be saved.
   *
   * Throws unconditionally so that callers (e.g. EntityTaskContext) can detect
   * that saving is unsupported and skip the auto-save step.  Contexts that
   * require auto-save must inject a service subclass that overrides this method.
   */
  async save(_options: never): Promise<AIAgentNoSaveResult> {
    throw new Error(
      `[ElectronAIAgentTaskService] save() is not supported for agent "${this.agentId}". ` +
      `Provide a domain-specific service subclass if persistence is required.`,
    )
  }
}

// ---------------------------------------------------------------------------
// Factory — produces a dedicated service instance per agent id.
// Prefer the factory over constructing ElectronAIAgentTaskService directly so
// call-sites remain decoupled from the concrete class name.
// ---------------------------------------------------------------------------

/**
 * Returns a new ElectronAIAgentTaskService bound to the given agentId.
 *
 * Usage:
 *   const service = createAIAgentTaskService('story-writer')
 *   <SomeAgentTaskProvider service={service} …>
 */
export function createAIAgentTaskService(agentId: string): ElectronAIAgentTaskService {
  return new ElectronAIAgentTaskService(agentId)
}
