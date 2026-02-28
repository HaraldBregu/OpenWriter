import { webContents } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { AIAgentsManager } from '../aiAgentsManager/AIAgentsManager'
import type { AIAgentsRegistry } from '../aiAgentsManager/AIAgentsRegistry'
import { toAIAgentsDefinitionInfo } from '../aiAgentsManager/AIAgentsDefinition'
import type { AgentRequest, AgentSessionConfig } from '../aiAgentsManager/AIAgentsManagerTypes'
import { registerQuery, registerCommand, registerCommandWithEvent } from './IpcGateway'
import { AiAgentChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for the AIAgentsManager subsystem.
 *
 * Channels (invoke/handle):
 *  - aiAgent:listAgents     (query)   -- List all registered agent definitions.
 *  - aiAgent:getAgent       (query)   -- Get a single agent definition by id.
 *  - aiAgent:getStatus      (query)   -- Return manager status snapshot.
 *  - aiAgent:listSessions   (query)   -- List all active sessions.
 *  - aiAgent:getSession     (query)   -- Get a session snapshot by id.
 *  - aiAgent:listActiveRuns (query)   -- List all active runs.
 *  - aiAgent:createSession  (command) -- Create a new agent session. Returns sessionId.
 *  - aiAgent:destroySession (command) -- Destroy a session and cancel its runs.
 *  - aiAgent:cancelRun      (command) -- Cancel a single run by id.
 *  - aiAgent:cancelSession  (command) -- Cancel all runs for a session.
 *  - aiAgent:startStreaming (command) -- Start a streaming run. Returns runId.
 *
 * Streaming events are pushed directly to the originating renderer window on
 * the `aiAgent:event` channel via webContents.send.
 *
 * Security notes:
 *  - windowId for startStreaming is always stamped from event.sender.id, never
 *    trusted from the renderer payload.
 *  - agentId is validated against the registry before createSession proceeds.
 */
export class AIAgentsManagerIpc implements IpcModule {
  readonly name = 'aiAgent'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const manager = container.get<AIAgentsManager>('AIAgentsManager')
    const registry = container.get<AIAgentsRegistry>('AIAgentsRegistry')

    /**
     * List all registered named agent definitions (IPC-safe snapshots).
     */
    registerQuery(AiAgentChannels.listAgents, () => {
      return registry.listInfo()
    })

    /**
     * Get a single named agent definition by id.
     * Returns undefined when the id is not registered.
     */
    registerQuery(AiAgentChannels.getAgent, (agentId: string) => {
      const def = registry.get(agentId)
      return def ? toAIAgentsDefinitionInfo(def) : undefined
    })

    /**
     * Return a snapshot of manager metrics: totalSessions, activeSessions, activeRuns.
     */
    registerQuery(AiAgentChannels.getStatus, () => {
      return manager.getStatus()
    })

    /**
     * List all active sessions as serializable snapshots.
     */
    registerQuery(AiAgentChannels.listSessions, () => {
      return manager.listSessions()
    })

    /**
     * Get a single session snapshot by id.
     * Returns undefined when the sessionId is unknown.
     */
    registerQuery(AiAgentChannels.getSession, (sessionId: string) => {
      return manager.getSession(sessionId)
    })

    /**
     * List all active (in-flight) runs as serializable snapshots.
     */
    registerQuery(AiAgentChannels.listActiveRuns, () => {
      return manager.listActiveRuns()
    })

    /**
     * Create a new agent session.
     * The agentId is validated against the registry; unknown ids throw.
     * Returns the new sessionId.
     */
    registerCommand(AiAgentChannels.createSession, (agentId: string, config?: Partial<AgentSessionConfig>) => {
      const def = registry.get(agentId)
      if (!def) {
        throw new Error(`Unknown agent id: "${agentId}"`)
      }
      const baseConfig: AgentSessionConfig = {
        ...def.defaultConfig,
        providerId: def.defaultConfig.providerId ?? '',
        ...config,
      }
      const snapshot = manager.createSession(baseConfig)
      return snapshot.sessionId
    })

    /**
     * Destroy a session and cancel all of its active runs.
     */
    registerCommand(AiAgentChannels.destroySession, (sessionId: string) => {
      manager.destroySession(sessionId)
    })

    /**
     * Cancel a single in-flight run by runId.
     */
    registerCommand(AiAgentChannels.cancelRun, (runId: string) => {
      manager.cancelRun(runId)
    })

    /**
     * Cancel all active runs for a session.
     */
    registerCommand(AiAgentChannels.cancelSession, (sessionId: string) => {
      manager.cancelSession(sessionId)
    })

    /**
     * Start a streaming run for an existing session.
     * The windowId is stamped server-side from event.sender.id for security.
     * Stream events are pushed to the originating window on `aiAgent:event`.
     * Returns the runId immediately (fire-and-start pattern).
     */
    registerCommandWithEvent(AiAgentChannels.startStreaming, async (event, sessionId: string, request: AgentRequest, _options?: { windowId?: number }) => {
      // Security: always use the sender's webContents ID, never the renderer-supplied windowId.
      const windowId = event.sender.id

      const runId = manager.startStreaming(sessionId, request, { windowId: undefined })

      // Subscribe to stream events emitted by the manager for this run and
      // forward them to the originating window on the typed aiAgent:event channel.
      const unsubscribe = _eventBus.on('AIAgentsManager:run:complete', () => {
        // Cleanup handled by manager internally; no relay needed here.
      })
      // Remove the no-op listener immediately — actual relay is set up below.
      unsubscribe()

      // Relay: iterate the stream generator in the background and push events
      // directly to the originating renderer window on `aiAgent:event`.
      const iterate = async (): Promise<void> => {
        for await (const streamEvent of manager.stream(sessionId, request)) {
          const wc = webContents.fromId(windowId)
          if (!wc || wc.isDestroyed()) break
          wc.send(AiAgentChannels.event, streamEvent)
        }
      }

      iterate().catch((err) => {
        console.error(`[AIAgentsManagerIpc] Unexpected error relaying stream for run ${runId}:`, err)
      })

      return runId
    }, _eventBus)

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
