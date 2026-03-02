/**
 * AgentTaskHandler — bridge between TaskManager and AI Agents subsystems.
 *
 * One instance per registered agent definition (e.g. 'agent-story-writer').
 * Calls executeAIAgentsStream directly — no session management.
 * This is the *only* file that imports from both subsystems, keeping them
 * fully decoupled from each other.
 */

import { randomUUID } from 'node:crypto'
import type { TaskHandler, ProgressReporter, StreamReporter } from '../TaskHandler'
import type { AgentRegistry } from '../../agents/AgentRegistry'
import { executeAIAgentsStream } from '../../agents/AgentExecutor'
import type { AgentStreamEvent } from '../../agents/AgentTypes'
import type { ProviderResolver } from '../../shared/ProviderResolver'

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
    private readonly agentsRegistry: AgentRegistry,
    private readonly providerResolver: ProviderResolver,
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
  // Execute
  // -------------------------------------------------------------------------

  async execute(
    input: AgentTaskInput,
    signal: AbortSignal,
    reporter: ProgressReporter,
    streamReporter?: StreamReporter,
  ): Promise<AgentTaskOutput> {
    // 1. Resolve agent definition
    const def = this.agentsRegistry.get(this.agentId)
    if (!def) {
      throw new Error(`Agent "${this.agentId}" not found in registry`)
    }
    reporter.progress(5, 'Resolved agent definition')

    // 2. Resolve provider
    const providerId = input.providerId ?? def.defaultConfig.providerId
    const provider = this.providerResolver.resolve({
      providerId,
      modelId: input.modelId ?? def.defaultConfig.modelId,
    })
    reporter.progress(10, 'Provider resolved')

    // 3. Stream via executor directly
    let content = ''
    let tokenCount = 0
    let tokensSinceLastProgress = 0
    let currentProgress = 10

    const gen = executeAIAgentsStream({
      runId: randomUUID(),
      provider,
      systemPrompt: def.defaultConfig.systemPrompt ?? '',
      temperature: input.temperature ?? def.defaultConfig.temperature ?? 0.7,
      maxTokens: input.maxTokens ?? def.defaultConfig.maxTokens,
      history: [],
      prompt: input.prompt,
      signal,
      buildGraph: def.buildGraph,
    })

    for await (const event of gen) {
      this.handleStreamEvent(
        event,
        streamReporter,
        () => {
          tokensSinceLastProgress++
          if (tokensSinceLastProgress >= 20 && currentProgress < 90) {
            currentProgress = Math.min(currentProgress + 2, 90)
            tokensSinceLastProgress = 0
            reporter.progress(currentProgress, 'Streaming…')
          }
        },
        (tc) => { tokenCount = tc },
        (c) => { content = c },
      )
    }

    reporter.progress(100, 'Complete')
    return { content, tokenCount, agentId: this.agentId }
  }

  // -------------------------------------------------------------------------
  // Internal — event dispatch
  // -------------------------------------------------------------------------

  private handleStreamEvent(
    event: AgentStreamEvent,
    streamReporter: StreamReporter | undefined,
    onToken: () => void,
    setTokenCount: (n: number) => void,
    setContent: (s: string) => void,
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
