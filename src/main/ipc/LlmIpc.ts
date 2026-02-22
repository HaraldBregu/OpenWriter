import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import { wrapSimpleHandler } from './IpcErrorHandler'

/**
 * IPC Module for LLM inference operations.
 * Handles chat completions with streaming support for brain subsections.
 */
export class LlmIpc implements IpcModule {
  readonly name = 'llm'

  register(container: ServiceContainer, eventBus: EventBus): void {
    // Simple inference - delegates to existing pipeline/agent infrastructure
    ipcMain.handle(
      'llm:chat',
      wrapSimpleHandler(async (request: {
        messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
        sessionId: string
        providerId: string
        temperature?: number
        maxTokens?: number
      }) => {
        const { messages, sessionId, providerId, temperature, maxTokens } = request

        // Generate a unique run ID for this inference
        const runId = `${sessionId}-${Date.now()}`

        // Emit chat request through event bus for pipeline processing
        eventBus.emit('llm:chat:request', {
          runId,
          sessionId,
          providerId,
          messages,
          temperature: temperature ?? 0.7,
          maxTokens: maxTokens ?? 2048,
          timestamp: Date.now()
        })

        // Return the run ID immediately for tracking
        return { runId, sessionId }
      }, 'llm:chat')
    )

    // Cancel inference
    ipcMain.on('llm:cancel', (_event, runId: string) => {
      eventBus.emit('llm:cancel', { runId, timestamp: Date.now() })
    })

    // Session management
    ipcMain.handle(
      'llm:create-session',
      wrapSimpleHandler(async (config: {
        sessionId: string
        providerId: string
        systemPrompt?: string
        temperature?: number
        maxTokens?: number
      }) => {
        // Session creation - store in service container
        eventBus.emit('llm:session:create', {
          ...config,
          createdAt: Date.now()
        })

        return {
          sessionId: config.sessionId,
          providerId: config.providerId,
          createdAt: Date.now(),
          isActive: true
        }
      }, 'llm:create-session')
    )

    ipcMain.handle(
      'llm:destroy-session',
      wrapSimpleHandler(async (sessionId: string) => {
        eventBus.emit('llm:session:destroy', { sessionId, timestamp: Date.now() })
        return true
      }, 'llm:destroy-session')
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
