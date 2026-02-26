import { ipcMain, BrowserWindow } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { AgentService, AgentSessionConfig, AgentRunOptions } from '../services/agent'
import { AgentValidators, StoreValidators } from '../shared/validators'
import { wrapIpcHandler } from './IpcErrorHandler'
import { AgentChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for agent operations.
 *
 * This module is responsible for:
 *   - Registering all agent-related IPC channels
 *   - Validating IPC inputs
 *   - Delegating business logic to AgentService
 *   - Handling window context for agent execution
 *
 * All state management and agent logic live in AgentService.
 */
export class AgentIpc implements IpcModule {
  readonly name = 'agent'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const agent = container.get<AgentService>('agent')

    // ===== Session Management =====

    ipcMain.handle(
      AgentChannels.createSession,
      wrapIpcHandler(async (_event, config: AgentSessionConfig) => {
        return agent.createSession(config)
      }, AgentChannels.createSession)
    )

    ipcMain.handle(
      AgentChannels.destroySession,
      wrapIpcHandler(async (_event, sessionId: string) => {
        return agent.destroySession(sessionId)
      }, AgentChannels.destroySession)
    )

    ipcMain.handle(
      AgentChannels.getSession,
      wrapIpcHandler(async (_event, sessionId: string) => {
        return agent.getSession(sessionId)
      }, AgentChannels.getSession)
    )

    ipcMain.handle(
      AgentChannels.listSessions,
      wrapIpcHandler(async () => {
        return agent.listSessions()
      }, AgentChannels.listSessions)
    )

    ipcMain.handle(
      AgentChannels.clearSessions,
      wrapIpcHandler(async () => {
        return agent.clearSessions()
      }, AgentChannels.clearSessions)
    )

    // ===== Agent Execution =====

    ipcMain.handle(
      AgentChannels.run,
      wrapIpcHandler(async (event: IpcMainInvokeEvent, messages, runId, providerId) => {
        // Validate inputs
        AgentValidators.validateMessages(messages)
        AgentValidators.validateRunId(runId)
        StoreValidators.validateProviderId(providerId)

        const win = BrowserWindow.fromWebContents(event.sender)
        if (!win) throw new Error('No window found')

        return await agent.runAgentWithDefaultSession(messages, runId, providerId, win)
      }, AgentChannels.run)
    )

    ipcMain.handle(
      AgentChannels.runSession,
      wrapIpcHandler(async (event: IpcMainInvokeEvent, options: AgentRunOptions) => {
        // Validate inputs
        AgentValidators.validateSessionId(options.sessionId)
        AgentValidators.validateRunId(options.runId)
        AgentValidators.validateMessages(options.messages)
        StoreValidators.validateProviderId(options.providerId)

        const win = BrowserWindow.fromWebContents(event.sender)
        if (!win) throw new Error('No window found')

        return await agent.runAgentSession(options, win)
      }, AgentChannels.runSession)
    )

    ipcMain.on(AgentChannels.cancel, (_event, runId: string) => {
      agent.cancelRun(runId)
    })

    ipcMain.handle(
      AgentChannels.cancelSession,
      wrapIpcHandler(async (_event, sessionId: string) => {
        return agent.cancelSession(sessionId)
      }, AgentChannels.cancelSession)
    )

    // ===== Agent Status =====

    ipcMain.handle(
      AgentChannels.getStatus,
      wrapIpcHandler(async () => {
        return agent.getStatus()
      }, AgentChannels.getStatus)
    )

    ipcMain.handle(
      AgentChannels.isRunning,
      wrapIpcHandler(async (_event, runId: string) => {
        return agent.isRunning(runId)
      }, AgentChannels.isRunning)
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
