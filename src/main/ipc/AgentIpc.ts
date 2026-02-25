import { ipcMain, BrowserWindow } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { AgentService, AgentSessionConfig, AgentRunOptions } from '../services/agent'
import { AgentValidators, StoreValidators } from '../shared/validators'
import { wrapIpcHandler } from './IpcErrorHandler'

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
      'agent:create-session',
      wrapIpcHandler(async (_event, config: AgentSessionConfig) => {
        return agent.createSession(config)
      }, 'agent:create-session')
    )

    ipcMain.handle(
      'agent:destroy-session',
      wrapIpcHandler(async (_event, sessionId: string) => {
        return agent.destroySession(sessionId)
      }, 'agent:destroy-session')
    )

    ipcMain.handle(
      'agent:get-session',
      wrapIpcHandler(async (_event, sessionId: string) => {
        return agent.getSession(sessionId)
      }, 'agent:get-session')
    )

    ipcMain.handle(
      'agent:list-sessions',
      wrapIpcHandler(async () => {
        return agent.listSessions()
      }, 'agent:list-sessions')
    )

    ipcMain.handle(
      'agent:clear-sessions',
      wrapIpcHandler(async () => {
        return agent.clearSessions()
      }, 'agent:clear-sessions')
    )

    // ===== Agent Execution =====

    ipcMain.handle(
      'agent:run',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, messages, runId, providerId) => {
        // Validate inputs
        AgentValidators.validateMessages(messages)
        AgentValidators.validateRunId(runId)
        StoreValidators.validateProviderId(providerId)

        const win = BrowserWindow.fromWebContents(event.sender)
        if (!win) throw new Error('No window found')

        return await agent.runAgentWithDefaultSession(messages, runId, providerId, win)
      }, 'agent:run')
    )

    ipcMain.handle(
      'agent:run-session',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, options: AgentRunOptions) => {
        // Validate inputs
        AgentValidators.validateSessionId(options.sessionId)
        AgentValidators.validateRunId(options.runId)
        AgentValidators.validateMessages(options.messages)
        StoreValidators.validateProviderId(options.providerId)

        const win = BrowserWindow.fromWebContents(event.sender)
        if (!win) throw new Error('No window found')

        return await agent.runAgentSession(options, win)
      }, 'agent:run-session')
    )

    ipcMain.on('agent:cancel', (_event, runId: string) => {
      agent.cancelRun(runId)
    })

    ipcMain.handle(
      'agent:cancel-session',
      wrapIpcHandler(async (_event, sessionId: string) => {
        return agent.cancelSession(sessionId)
      }, 'agent:cancel-session')
    )

    // ===== Agent Status =====

    ipcMain.handle(
      'agent:get-status',
      wrapIpcHandler(async () => {
        return agent.getStatus()
      }, 'agent:get-status')
    )

    ipcMain.handle(
      'agent:is-running',
      wrapIpcHandler(async (_event, runId: string) => {
        return agent.isRunning(runId)
      }, 'agent:is-running')
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
