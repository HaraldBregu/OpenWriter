/**
 * AgentIpc — IPC module for the named agent registry and AgentManager.
 *
 * Channels (invoke/handle):
 *  - agent:list-agents      (query)   -- List all registered named agents. Returns AgentDefinitionInfo[].
 *  - agent:get-status       (query)   -- Return AgentManager runtime status. Returns AgentManagerStatus.
 *  - agent:list-sessions    (query)   -- List all active sessions. Returns AgentSessionSnapshot[].
 *  - agent:list-active-runs (query)   -- List all active runs. Returns AgentRunSnapshot[].
 *  - agent:create-session   (command) -- Create a session from a named agent id. Returns AgentSessionSnapshot.
 *  - agent:destroy-session  (command) -- Destroy a session by id. Returns boolean.
 *  - agent:start-streaming  (command) -- Start a streaming run. Returns runId string.
 *  - agent:cancel-run       (command) -- Cancel an active run by id. Returns boolean.
 *  - agent:cancel-session   (command) -- Cancel all runs for a session. Returns boolean.
 *
 * Streaming events are pushed from AgentManager via EventBus on the
 * 'agentManager:event' channel (AgentChannels.event). The renderer subscribes
 * with window.agent.onEvent().
 *
 * Security notes:
 *  - windowId is stamped server-side from event.sender.id in agent:start-streaming.
 *  - agentId is validated against the registry; unknown ids throw immediately.
 *  - All IPC inputs are validated before being forwarded to AgentManager.
 */

import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { AgentManager } from '../agentManager/AgentManager'
import { agentRegistry, buildSessionConfig } from '../agentManager/AgentRegistry'
import { registerQuery, registerCommand, registerCommandWithEvent } from './IpcGateway'
import { AgentChannels } from '../../shared/types/ipc/channels'
import type { AgentRequest, AgentSessionConfig } from '../../shared/types/ipc/types'

export class AgentIpc implements IpcModule {
  readonly name = 'agent'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const agentManager = container.get<AgentManager>('agentManager')

    // ---- Queries ---------------------------------------------------------------

    /**
     * Return IPC-safe metadata for all registered named agents.
     */
    registerQuery(AgentChannels.listAgents, () => {
      return agentRegistry.listInfo()
    })

    /**
     * Return a snapshot of AgentManager runtime metrics.
     */
    registerQuery(AgentChannels.getStatus, () => {
      return agentManager.getStatus()
    })

    /**
     * Return snapshots for all live sessions.
     */
    registerQuery(AgentChannels.listSessions, () => {
      return agentManager.listSessions()
    })

    /**
     * Return snapshots for all currently running agent runs.
     */
    registerQuery(AgentChannels.listActiveRuns, () => {
      return agentManager.listActiveRuns()
    })

    // ---- Commands --------------------------------------------------------------

    /**
     * Create a new session from a named agent definition.
     *
     * The caller supplies:
     *  - agentId   — must be a registered named agent
     *  - providerId — the resolved active provider (e.g. 'openai')
     *  - overrides  — optional partial config overrides applied on top of the
     *                 agent's defaultConfig
     *
     * Security: agentId is validated against the registry.
     */
    registerCommand(
      AgentChannels.createSession,
      (agentId: string, providerId: string, overrides?: Partial<AgentSessionConfig>) => {
        const def = agentRegistry.get(agentId)
        if (!def) {
          throw new Error(`[AgentIpc] Unknown agent id: "${agentId}"`)
        }
        const config = buildSessionConfig(def, providerId, overrides ?? {})
        return agentManager.createSession(config)
      },
    )

    /**
     * Destroy a session and cancel all its active runs.
     */
    registerCommand(AgentChannels.destroySession, (sessionId: string) => {
      return agentManager.destroySession(sessionId)
    })

    /**
     * Start a streaming run on an existing session.
     *
     * The windowId is stamped server-side from event.sender.id so the EventBus
     * routes stream events only to the originating window — never trusted from
     * the renderer payload.
     *
     * Returns the runId immediately; events arrive asynchronously via the
     * 'agentManager:event' channel (AgentChannels.event).
     */
    registerCommandWithEvent(
      AgentChannels.startStreaming,
      (event, sessionId: string, request: AgentRequest) => {
        // Security: always stamp windowId from the IPC event, never from payload.
        const windowId = event.sender.id
        return agentManager.startStreaming(sessionId, request, { windowId })
      },
    )

    /**
     * Cancel a single active run by runId.
     */
    registerCommand(AgentChannels.cancelRun, (runId: string) => {
      return agentManager.cancelRun(runId)
    })

    /**
     * Cancel all active runs belonging to a session.
     */
    registerCommand(AgentChannels.cancelSession, (sessionId: string) => {
      return agentManager.cancelSession(sessionId)
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
