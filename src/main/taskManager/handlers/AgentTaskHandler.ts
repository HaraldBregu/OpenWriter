/**
 * AgentTaskHandler — bridge between TaskManager and AI Agents subsystems.
 *
 * One instance per registered agent definition (e.g. 'agent-story-writer').
 * This is the *only* file that imports from both subsystems, keeping them
 * fully decoupled from each other.
 */

import type { TaskHandler, ProgressReporter, StreamReporter } from '../TaskHandler'
import type { AIAgentsManager } from '../../AIAgentsManager/AIAgentsManager'
import type { AIAgentsRegistry } from '../../AIAgentsManager/AIAgentsRegistry'
import { buildSessionConfig } from '../../AIAgentsManager/AIAgentsRegistry'
import type { AgentStreamEvent } from '../../AIAgentsManager/AIAgentsManagerTypes'

// ---------------------------------------------------------------------------
// Input / Output (self-contained — no agent-system type re-exports)
// ---------------------------------------------------------------------------

export interface AgentTaskInput {
  prompt: string
  providerId?: string
  modelId?: string
  temperature?: number
  maxTokens?: number
}

export interface AgentTaskOutput {
  content: string
  tokenCount: number
  agentId: string
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export class AgentTaskHandler implements TaskHandler<AgentTaskInput, AgentTaskOutput> {
  readonly type: string

  constructor(
    private readonly agentId: string,
    private readonly agentsManager: AIAgentsManager,
    private readonly agentsRegistry: AIAgentsRegistry,
  ) {
    this.type = `agent-${agentId}`
  }

  // -------------------------------------------------------------------------
  // Validate (pre-queue guard)
  // -------------------------------------------------------------------------

  validate(input: AgentTaskInput): void {
    if (!this.agentsRegistry.has(this.agentId)) {
      throw new Error(`Agent "${this.agentId}" is not registered`)
    }
    if (!input?.prompt || typeof input.prompt !== 'string' || input.prompt.trim().length === 0) {
      throw new Error('AgentTaskInput.prompt must be a non-empty string')
    }
  }

  // -------------------------------------------------------------------------
  // Execute (5-phase lifecycle)
  // -------------------------------------------------------------------------

  async execute(
    input: AgentTaskInput,
    signal: AbortSignal,
    reporter: ProgressReporter,
    streamReporter?: StreamReporter,
  ): Promise<AgentTaskOutput> {
    // Phase 1 — Resolve agent definition
    const def = this.agentsRegistry.get(this.agentId)
    if (!def) {
      throw new Error(`Agent "${this.agentId}" not found in registry`)
    }
    reporter.progress(5, 'Resolved agent definition')

    // Phase 2 — Create ephemeral session
    const providerId = input.providerId ?? def.defaultConfig.providerId ?? 'openai'
    const sessionConfig = buildSessionConfig(def, providerId, {
      modelId: input.modelId,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    })
    const session = this.agentsManager.createSession(sessionConfig)
    const sessionId = session.sessionId
    reporter.progress(10, 'Session created')

    // Phase 3–5 — Stream, forward events, cleanup
    let content = ''
    let tokenCount = 0
    let tokensSinceLastProgress = 0
    let currentProgress = 10

    try {
      const request = { prompt: input.prompt }
      const gen = this.agentsManager.stream(sessionId, request, signal)

      for await (const event of gen) {
        this.handleStreamEvent(
          event,
          streamReporter,
          reporter,
          (tc) => { tokenCount = tc },
          (c) => { content = c },
          () => {
            tokensSinceLastProgress++
            if (tokensSinceLastProgress >= 20 && currentProgress < 90) {
              currentProgress = Math.min(currentProgress + 2, 90)
              tokensSinceLastProgress = 0
              reporter.progress(currentProgress, 'Streaming…')
            }
          },
        )
      }

      reporter.progress(100, 'Complete')
      return { content, tokenCount, agentId: this.agentId }
    } finally {
      // Phase 5 — Always destroy ephemeral session
      this.agentsManager.destroySession(sessionId)
    }
  }

  // -------------------------------------------------------------------------
  // Internal — event dispatch
  // -------------------------------------------------------------------------

  private handleStreamEvent(
    event: AgentStreamEvent,
    streamReporter: StreamReporter | undefined,
    _reporter: ProgressReporter,
    setTokenCount: (n: number) => void,
    setContent: (s: string) => void,
    onToken: () => void,
  ): void {
    switch (event.type) {
      case 'token':
        streamReporter?.stream(event.token)
        onToken()
        break

      case 'done':
        setContent(event.content)
        setTokenCount(event.tokenCount)
        break

      case 'error':
        if (event.code === 'abort') {
          throw new DOMException('Aborted', 'AbortError')
        }
        throw new Error(event.error)

      // 'thinking' events are informational — no action needed
    }
  }
}
