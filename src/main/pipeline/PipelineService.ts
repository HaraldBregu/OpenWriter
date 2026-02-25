/**
 * PipelineService -- the orchestrator for agent runs.
 *
 * Responsibilities:
 *  1. Accept run requests (agent name + input) from PipelineIpc.
 *  2. Look up the agent in AgentRegistry.
 *  3. Create an AbortController per run so each run can be cancelled independently.
 *  4. Iterate over the agent's async generator and forward each AgentEvent
 *     to the EventBus for delivery to the renderer.
 *  5. Track active runs so concurrent agents can coexist.
 *
 * Inherits lifecycle management from ExecutorBase to eliminate duplicate code
 * shared with TaskExecutorService.
 */

import { randomUUID } from 'crypto'
import { ExecutorBase, type ExecutionRecord } from '../services/ExecutorBase'
import type { EventBus } from '../core/EventBus'
import type { AgentRegistry } from './AgentRegistry'
import type { AgentInput } from './AgentBase'

interface PipelineRun extends ExecutionRecord {
  id: string
  agentName: string
  controller: AbortController
  startedAt: number
}

export class PipelineService extends ExecutorBase<PipelineRun> {

  constructor(
    private readonly registry: AgentRegistry,
    eventBus: EventBus
  ) {
    super(eventBus)
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Start an agent run. Returns the generated runId immediately.
   *
   * Streaming events are broadcast via EventBus on channel `pipeline:event`
   * so any renderer window listening will receive them.
   *
   * @param agentName - Name of the registered agent to run
   * @param input     - Prompt and optional context
   * @param windowId  - BrowserWindow ID to send events to (optional, broadcasts if omitted)
   * @returns The unique run ID
   */
  async start(agentName: string, input: AgentInput, windowId?: number): Promise<string> {
    const agent = this.registry.get(agentName)
    if (!agent) {
      const available = this.registry.listNames().join(', ') || '(none)'
      throw new Error(
        `[PipelineService] Unknown agent "${agentName}". Available: ${available}`
      )
    }

    const runId = randomUUID()
    const controller = new AbortController()

    this.activeRuns.set(runId, {
      runId,
      agentName,
      controller,
      startedAt: Date.now()
    })

    console.log(`[PipelineService] Starting run ${runId} with agent "${agentName}"`)

    // Drive the generator in the background -- do NOT await here so the
    // IPC handler can return the runId to the renderer immediately.
    this.driveRun(runId, agent.name, agent.run(input, runId, controller.signal), windowId)

    return runId
  }

  /**
   * Cancel an in-flight run by its ID.
   * Returns true if the run was found and aborted, false otherwise.
   */
  cancel(runId: string): boolean {
    const run = this.activeRuns.get(runId)
    if (!run) return false

    console.log(`[PipelineService] Cancelling run ${runId}`)
    run.controller.abort()
    this.activeRuns.delete(runId)
    return true
  }

  /**
   * Check whether a run is currently active.
   */
  isRunning(runId: string): boolean {
    return this.activeRuns.has(runId)
  }

  /**
   * Return a snapshot of all active runs.
   */
  listActiveRuns(): Array<{ runId: string; agentName: string; startedAt: number }> {
    return Array.from(this.activeRuns.values()).map(({ runId, agentName, startedAt }) => ({
      runId,
      agentName,
      startedAt
    }))
  }

  /**
   * Return the names of all agents available in the registry.
   */
  listAgents(): string[] {
    return this.registry.listNames()
  }

  /**
   * Disposable -- abort every active run on shutdown.
   */
  destroy(): void {
    console.log(`[PipelineService] Destroying, aborting ${this.activeRuns.size} active run(s)`)
    for (const run of this.activeRuns.values()) {
      run.controller.abort()
    }
    this.activeRuns.clear()
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  /**
   * Consume the agent's async generator and forward events.
   *
   * The function deliberately does NOT throw -- all errors are caught
   * and delivered to the renderer as `pipeline:event` with type `error`.
   */
  private async driveRun(
    runId: string,
    agentName: string,
    generator: AsyncGenerator<import('./AgentBase').AgentEvent>,
    windowId?: number
  ): Promise<void> {
    try {
      for await (const event of generator) {
        // If the run was cancelled while we were iterating, stop.
        if (!this.activeRuns.has(runId)) break

        this.send(windowId, 'pipeline:event', event)
      }
    } catch (err) {
      // AbortError is expected when the run is cancelled.
      if (err instanceof Error && err.name === 'AbortError') {
        console.log(`[PipelineService] Run ${runId} aborted`)
      } else {
        console.error(`[PipelineService] Run ${runId} failed:`, err)
        const message = err instanceof Error ? err.message : String(err)
        this.send(windowId, 'pipeline:event', {
          type: 'error',
          data: { runId, message }
        })
      }
    } finally {
      this.activeRuns.delete(runId)
      console.log(
        `[PipelineService] Run ${runId} (${agentName}) finished. ` +
          `Active runs: ${this.activeRuns.size}`
      )
    }
  }

  /**
   * Send an event to a specific window or broadcast to all windows.
   */
  private send(windowId: number | undefined, channel: string, ...args: unknown[]): void {
    if (windowId !== undefined) {
      this.eventBus.sendTo(windowId, channel, ...args)
    } else {
      this.eventBus.broadcast(channel, ...args)
    }
  }
}
