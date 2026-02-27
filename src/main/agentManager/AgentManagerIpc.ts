/**
 * IPC module for AgentManager.
 *
 * Follows the same pattern as TaskIpc — uses registerQuery,
 * registerCommand, and registerCommandWithEvent from IpcGateway.
 */

import { ipcMain } from 'electron'
import type { IpcModule } from '../ipc/IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { AgentManager } from './AgentManager'
import { registerQuery, registerCommand, registerCommandWithEvent } from '../ipc/IpcGateway'
import { AgentManagerChannels } from '../../shared/types/ipc/channels'
import type { AgentSessionConfig, AgentRequest } from './AgentManagerTypes'

export class AgentManagerIpc implements IpcModule {
  readonly name = 'agentManager'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const manager = container.get<AgentManager>('agentManager')

    // --- Session lifecycle ---------------------------------------------------

    registerCommand(AgentManagerChannels.createSession, (config: AgentSessionConfig) => {
      return manager.createSession(config)
    })

    registerCommand(AgentManagerChannels.destroySession, (sessionId: string) => {
      return manager.destroySession(sessionId)
    })

    registerQuery(AgentManagerChannels.getSession, (sessionId: string) => {
      return manager.getSession(sessionId) ?? null
    })

    registerQuery(AgentManagerChannels.listSessions, () => {
      return manager.listSessions()
    })

    // --- Execution (fire-and-start) ------------------------------------------

    registerCommandWithEvent(
      AgentManagerChannels.start,
      (event, sessionId: string, request: AgentRequest) => {
        const windowId = event.sender.id
        const runId = manager.startStreaming(sessionId, request, { windowId })
        return { runId }
      }
    )

    // --- Cancellation (fire-and-forget via ipcMain.on) -----------------------

    ipcMain.on(AgentManagerChannels.cancel, (_event, runId: string) => {
      manager.cancelRun(runId)
    })

    registerCommand(AgentManagerChannels.cancelSession, (sessionId: string) => {
      return manager.cancelSession(sessionId)
    })

    // --- Status --------------------------------------------------------------

    registerQuery(AgentManagerChannels.getStatus, () => {
      return manager.getStatus()
    })

    registerQuery(AgentManagerChannels.listRuns, () => {
      return manager.listActiveRuns()
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
