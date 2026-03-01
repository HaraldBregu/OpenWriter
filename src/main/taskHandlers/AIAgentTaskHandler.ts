/**
 * AIAgentTaskHandler — generic task handler that runs any registered AI agent.
 *
 * A single handler covers all named agents (StoryWriter, TextCompleter,
 * ContentReview, Summarizer, ToneAdjuster, …) by looking them up at
 * execution time via AIAgentsRegistry.  The caller supplies the agentId
 * and prompt; this handler owns the full session lifecycle so the session
 * is always destroyed, even on error or cancellation.
 *
 * Handler type identifier: 'ai-agent'
 */

import type { TaskHandler, ProgressReporter, StreamReporter } from '../taskManager/TaskHandler'
import type { AIAgentsManager } from '../aiAgentsManager/AIAgentsManager'
import type { AIAgentsRegistry } from '../aiAgentsManager/AIAgentsRegistry'
import { buildSessionConfig } from '../aiAgentsManager/AIAgentsRegistry'
import type { AgentSessionConfig } from '../aiAgentsManager/AIAgentsManagerTypes'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIAgentTaskInput {
  /** Registered agent id — e.g. 'story-writer', 'text-completer', etc. */
  agentId: string
  /** The user prompt to send to the agent. */
  prompt: string
  /** The active provider id — e.g. 'openai'. */
  providerId: string
  /** Optional model override. */
  modelId?: string
  /** Optional per-run config overrides applied on top of the agent's defaultConfig. */
  overrides?: {
    temperature?: number
    maxTokens?: number
    modelId?: string
  }
}

export interface AIAgentTaskOutput {
  /** The agent's final response content. */
  content: string
  /** The agent id that was used. */
  agentId: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[AIAgentTaskHandler]'

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export class AIAgentTaskHandler
  implements TaskHandler<AIAgentTaskInput, AIAgentTaskOutput>
{
  readonly type = 'ai-agent'

  constructor(
    private readonly agentsManager: AIAgentsManager,
    private readonly registry: AIAgentsRegistry
  ) {}

  /**
   * Validate input before the task is queued.
   * Throws if any required field is missing or the agentId is not registered.
   */
  validate(input: AIAgentTaskInput): void {
    if (!input.agentId || typeof input.agentId !== 'string' || !input.agentId.trim()) {
      throw new Error('agentId is required and must be a non-empty string')
    }

    if (!input.prompt || typeof input.prompt !== 'string' || !input.prompt.trim()) {
      throw new Error('prompt is required and must be a non-empty string')
    }

    if (!this.registry.has(input.agentId)) {
      throw new Error(`Unknown agent: "${input.agentId}". Check AIAgentsRegistry for registered ids.`)
    }
  }

  /**
   * Execute the agent task.
   *
   * Lifecycle:
   *   1. Look up definition → build session config → create temporary session.
   *   2. Stream via the async generator on AIAgentsManager.
   *   3. Accumulate tokens via streamReporter; capture final content on 'done'.
   *   4. Destroy the session in a finally block (always cleaned up).
   */
  async execute(
    input: AIAgentTaskInput,
    signal: AbortSignal,
    reporter: ProgressReporter,
    streamReporter?: StreamReporter
  ): Promise<AIAgentTaskOutput> {
    reporter.progress(0, 'starting')

    // Look up the agent definition — validated in validate(), but guard anyway
    const def = this.registry.get(input.agentId)
    if (!def) {
      throw new Error(`${LOG_PREFIX} Agent definition not found: "${input.agentId}"`)
    }

    // Merge overrides with the agent's defaultConfig
    const configOverrides: Partial<AgentSessionConfig> = {}
    if (input.overrides?.temperature !== undefined) {
      configOverrides.temperature = input.overrides.temperature
    }
    if (input.overrides?.maxTokens !== undefined) {
      configOverrides.maxTokens = input.overrides.maxTokens
    }
    if (input.overrides?.modelId !== undefined) {
      configOverrides.modelId = input.overrides.modelId
    }
    // modelId at the top level also applies as an override
    if (input.modelId !== undefined && configOverrides.modelId === undefined) {
      configOverrides.modelId = input.modelId
    }

    const config = buildSessionConfig(def, input.providerId, configOverrides)

    // Create a temporary session scoped to this task execution
    const snapshot = this.agentsManager.createSession(config)
    const sessionId = snapshot.sessionId

    console.log(
      `${LOG_PREFIX} Session ${sessionId} created for agent "${input.agentId}" ` +
        `(provider=${input.providerId})`
    )

    reporter.progress(10, 'session ready')

    let fullContent = ''

    try {
      for await (const event of this.agentsManager.stream(
        sessionId,
        { prompt: input.prompt },
        signal
      )) {
        switch (event.type) {
          case 'token':
            fullContent += event.token
            streamReporter?.stream(event.token)
            break

          case 'done':
            // stream() sets fullContent on the done event; use it as the
            // authoritative final content (handles graph agents that may emit
            // fewer individual token events).
            fullContent = event.content
            break

          case 'error':
            if (event.code === 'abort') {
              throw new Error('Task cancelled')
            }
            throw new Error(event.error)

          default:
            // 'thinking' and any future event types — ignore silently
            break
        }

        // Respect external abort between events
        if (signal.aborted) {
          throw new Error('Task cancelled')
        }
      }

      reporter.progress(100, 'done')

      console.log(
        `${LOG_PREFIX} Agent "${input.agentId}" completed: ${fullContent.length} chars`
      )

      return { content: fullContent, agentId: input.agentId }
    } finally {
      // Always destroy the temporary session, even on error or cancellation
      this.agentsManager.destroySession(sessionId)
      console.log(`${LOG_PREFIX} Session ${sessionId} destroyed`)
    }
  }
}
