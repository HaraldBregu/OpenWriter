/**
 * AIAgentsManager — single entry point for all AI operations.
 *
 * Decouples execution from windows, owns sessions/history, and
 * consolidates the duplicated LangChain streaming code.
 *
 * Registered in ServiceContainer as 'AIAgentsManager'.
 */

import { randomUUID } from 'node:crypto'
import type { Disposable } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { StoreService } from '../services/store'
import { ProviderResolver } from '../shared/ProviderResolver'
import { AIAgentsSession } from './AIAgentsSession'
import { executeAIAgentsStream } from './AIAgentsExecutor'
import type {
  AgentSessionConfig,
  AgentRequest,
  AgentStreamEvent,
  AgentSessionSnapshot,
  AgentRunSnapshot,
  AIAgentsManagerStatus,
} from './aiAgentsManagerTypes'

const LOG_PREFIX = '[AIAgentsManager]'

interface ActiveRun {
  runId: string
  sessionId: string
  controller: AbortController
  startedAt: number
}

export class AIAgentsManager implements Disposable {
  private sessions = new Map<string, AIAgentsSession>()
  private activeRuns = new Map<string, ActiveRun>()
  private resolver: ProviderResolver

  constructor(
    storeService: StoreService,
    private readonly eventBus: EventBus,
  ) {
    this.resolver = new ProviderResolver(storeService)
    console.log(`${LOG_PREFIX} Initialized`)
  }

  // =========================================================================
  // Session lifecycle
  // =========================================================================

  createSession(config: AgentSessionConfig): AgentSessionSnapshot {
    const session = new AIAgentsSession(config)
    this.sessions.set(session.sessionId, session)
    console.log(`${LOG_PREFIX} Session created: ${session.sessionId}`)
    return session.toSnapshot()
  }

  getSession(sessionId: string): AgentSessionSnapshot | undefined {
    return this.sessions.get(sessionId)?.toSnapshot()
  }

  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    // Cancel all active runs for this session
    for (const runId of session.getActiveRunIds()) {
      this.cancelRun(runId)
    }

    this.sessions.delete(sessionId)
    console.log(`${LOG_PREFIX} Session destroyed: ${sessionId}`)
    return true
  }

  listSessions(): AgentSessionSnapshot[] {
    return [...this.sessions.values()].map((s) => s.toSnapshot())
  }

  // =========================================================================
  // Execution — async generator (for internal callers)
  // =========================================================================

  async *stream(
    sessionId: string,
    request: AgentRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<AgentStreamEvent> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      const runId = 'error'
      yield { type: 'error', error: `Session "${sessionId}" not found`, code: 'unknown', runId }
      return
    }

    const runId = randomUUID()
    const controller = new AbortController()

    // Link external signal to internal controller
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    const run: ActiveRun = { runId, sessionId, controller, startedAt: Date.now() }
    this.activeRuns.set(runId, run)
    session.addRun(runId)

    this.eventBus.emit('AIAgentsManager:run:start', { sessionId, runId })

    // Resolve provider (request overrides take precedence over session config)
    const provider = this.resolver.resolve({
      providerId: request.providerId ?? session.providerId,
      modelId: request.modelId ?? session.modelId,
    })

    const history = request.messages ?? session.getHistory()
    const temperature = request.temperature ?? session.temperature
    const maxTokens = request.maxTokens ?? session.maxTokens

    let fullContent = ''

    try {
      const gen = executeAIAgentsStream({
        runId,
        provider,
        systemPrompt: session.systemPrompt,
        temperature,
        maxTokens,
        history,
        prompt: request.prompt,
        signal: controller.signal,
        buildGraph: session.buildGraph,
      })

      for await (const event of gen) {
        if (event.type === 'done') {
          fullContent = event.content
        }
        yield event
      }

      // Append exchange to session history (only when using session history, not override)
      if (!request.messages && fullContent) {
        session.appendExchange(request.prompt, fullContent)
      }

      const duration = Date.now() - run.startedAt
      this.eventBus.emit('AIAgentsManager:run:complete', { sessionId, runId, duration })
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.eventBus.emit('AIAgentsManager:run:error', { sessionId, runId, error: errorMsg })
      yield { type: 'error', error: errorMsg, code: 'unknown', runId }
    } finally {
      session.removeRun(runId)
      this.activeRuns.delete(runId)
    }
  }

  // =========================================================================
  // Execution — fire-and-start (for IPC)
  // =========================================================================

  startStreaming(
    sessionId: string,
    request: AgentRequest,
    options?: { windowId?: number; signal?: AbortSignal },
  ): string {
    // Pre-validate session
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session "${sessionId}" not found`)
    }

    const runId = randomUUID()
    const controller = new AbortController()

    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    const run: ActiveRun = { runId, sessionId, controller, startedAt: Date.now() }
    this.activeRuns.set(runId, run)
    session.addRun(runId)

    this.eventBus.emit('AIAgentsManager:run:start', { sessionId, runId })

    // Resolve provider
    const provider = this.resolver.resolve({
      providerId: request.providerId ?? session.providerId,
      modelId: request.modelId ?? session.modelId,
    })

    const history = request.messages ?? session.getHistory()
    const temperature = request.temperature ?? session.temperature
    const maxTokens = request.maxTokens ?? session.maxTokens
    const windowId = options?.windowId

    // Fire-and-forget: iterate in background, push events via EventBus
    const channel = 'AIAgentsManager:event'
    const iterate = async (): Promise<void> => {
      let fullContent = ''

      try {
        const gen = executeAIAgentsStream({
          runId,
          provider,
          systemPrompt: session.systemPrompt,
          temperature,
          maxTokens,
          history,
          prompt: request.prompt,
          signal: controller.signal,
          buildGraph: session.buildGraph,
        })

        for await (const event of gen) {
          if (event.type === 'done') {
            fullContent = event.content
          }

          // Route event to specific window or broadcast
          if (windowId) {
            this.eventBus.sendTo(windowId, channel, event)
          } else {
            this.eventBus.broadcast(channel, event)
          }
        }

        // Append to session history
        if (!request.messages && fullContent) {
          session.appendExchange(request.prompt, fullContent)
        }

        const duration = Date.now() - run.startedAt
        this.eventBus.emit('AIAgentsManager:run:complete', { sessionId, runId, duration })
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        this.eventBus.emit('AIAgentsManager:run:error', { sessionId, runId, error: errorMsg })

        const errorEvent: AgentStreamEvent = { type: 'error', error: errorMsg, code: 'unknown', runId }
        if (windowId) {
          this.eventBus.sendTo(windowId, channel, errorEvent)
        } else {
          this.eventBus.broadcast(channel, errorEvent)
        }
      } finally {
        session.removeRun(runId)
        this.activeRuns.delete(runId)
      }
    }

    iterate().catch((err) => console.error(`${LOG_PREFIX} Unexpected error in run ${runId}:`, err))

    return runId
  }

  // =========================================================================
  // Cancellation
  // =========================================================================

  cancelRun(runId: string): boolean {
    const run = this.activeRuns.get(runId)
    if (!run) return false

    run.controller.abort()
    console.log(`${LOG_PREFIX} Run cancelled: ${runId}`)
    return true
  }

  cancelSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    const runIds = session.getActiveRunIds()
    for (const runId of runIds) {
      this.cancelRun(runId)
    }
    return runIds.length > 0
  }

  // =========================================================================
  // Status
  // =========================================================================

  getStatus(): AIAgentsManagerStatus {
    const totalSessions = this.sessions.size
    const activeSessions = [...this.sessions.values()].filter((s) => s.isActive).length
    return { totalSessions, activeSessions, activeRuns: this.activeRuns.size }
  }

  listActiveRuns(): AgentRunSnapshot[] {
    return [...this.activeRuns.values()].map((r) => ({
      runId: r.runId,
      sessionId: r.sessionId,
      startedAt: r.startedAt,
    }))
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  destroy(): void {
    const runCount = this.activeRuns.size
    const sessionCount = this.sessions.size

    // Abort all active runs
    for (const run of this.activeRuns.values()) {
      run.controller.abort()
    }

    this.activeRuns.clear()
    this.sessions.clear()

    console.log(
      `${LOG_PREFIX} Destroying... aborted ${runCount} run(s), cleared ${sessionCount} session(s)`
    )
  }
}
