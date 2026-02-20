import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import { BrowserWindow } from 'electron'
import type { StoreService } from '../services/store'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export class AgentController {
  private activeRuns = new Map<string, AbortController>()
  private storeService: StoreService

  constructor(storeService: StoreService) {
    this.storeService = storeService
  }

  async runAgent(
    messages: ChatMessage[],
    runId: string,
    providerId: string,
    win: BrowserWindow
  ): Promise<void> {
    const settings = this.storeService.getModelSettings(providerId)

    const apiKey = settings?.apiToken || import.meta.env.VITE_OPENAI_API_KEY
    if (!apiKey) {
      win.webContents.send('agent:error', {
        runId,
        error: `No API token configured for provider: ${providerId}`
      })
      return
    }

    const modelName = settings?.selectedModel || import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'

    const abortController = new AbortController()
    this.activeRuns.set(runId, abortController)

    try {
      console.log(
        `[Agent] Starting run ${runId} with provider=${providerId} model=${modelName} history=${messages.length} messages`
      )

      win.webContents.send('agent:thinking', {
        runId,
        thinking: 'Processing your request...'
      })

      const model = new ChatOpenAI({
        apiKey,
        model: modelName,
        streaming: true
      })

      // Build LangChain message chain from full history
      const langchainMessages = [
        new SystemMessage('You are a helpful AI assistant.'),
        ...messages.map((m) =>
          m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
        )
      ]

      const stream = await model.stream(langchainMessages, { signal: abortController.signal })

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break

        const token =
          typeof chunk.content === 'string'
            ? chunk.content
            : Array.isArray(chunk.content)
              ? chunk.content
                  .filter((c) => typeof c === 'object' && 'text' in c)
                  .map((c) => (c as { text: string }).text)
                  .join('')
              : ''

        if (token) {
          win.webContents.send('agent:token', { runId, token })
        }
      }

      if (!abortController.signal.aborted) {
        console.log(`[Agent] Run ${runId} completed`)
        win.webContents.send('agent:done', { runId })
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      const isAbort =
        errMsg.toLowerCase().includes('abort') ||
        errMsg.toLowerCase().includes('cancel') ||
        (error instanceof Error && error.name === 'AbortError')

      if (isAbort) {
        console.log(`[Agent] Run ${runId} cancelled`)
        win.webContents.send('agent:done', { runId, cancelled: true })
      } else {
        console.error(`[Agent] Run ${runId} error:`, errMsg)
        win.webContents.send('agent:error', { runId, error: errMsg })
      }
    } finally {
      this.activeRuns.delete(runId)
    }
  }

  cancel(runId: string): void {
    const controller = this.activeRuns.get(runId)
    if (controller) {
      console.log(`[Agent] Cancelling run ${runId}`)
      controller.abort()
      this.activeRuns.delete(runId)
    }
  }

  isRunning(runId: string): boolean {
    return this.activeRuns.has(runId)
  }
}
