/**
 * AIChatHandler -- Task handler for AI chat inference via LangChain.
 *
 * Streams tokens to the renderer through StreamReporter (stream events),
 * and returns the full response content as the task result on completion.
 *
 * This replaces the PipelineService/ChatAgent flow for personality pages,
 * giving the task system full control over queueing, cancellation, and
 * lifecycle events.
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import type { TaskHandler, ProgressReporter, StreamReporter } from '../TaskHandler'
import type { StoreService } from '../../services/store'
import { isReasoningModel, extractTokenFromChunk, classifyError, toUserMessage } from '../../shared/aiUtils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIChatInput {
  prompt: string
  providerId?: string
  systemPrompt?: string
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  modelId?: string
  temperature?: number
  maxTokens?: number
}

export interface AIChatOutput {
  content: string
  tokenCount: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[AIChatHandler]'
const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant.'

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export class AIChatHandler implements TaskHandler<AIChatInput, AIChatOutput> {
  readonly type = 'ai-chat'

  constructor(private readonly storeService: StoreService) {}

  validate(input: AIChatInput): void {
    if (!input.prompt || typeof input.prompt !== 'string') {
      throw new Error('Prompt is required and must be a non-empty string')
    }
  }

  async execute(
    input: AIChatInput,
    signal: AbortSignal,
    reporter: ProgressReporter,
    streamReporter?: StreamReporter
  ): Promise<AIChatOutput> {
    // --- Resolve configuration -----------------------------------------------

    const providerId = input.providerId || 'openai'
    const storeSettings = this.storeService.getModelSettings(providerId)

    const apiKey = storeSettings?.apiToken || import.meta.env.VITE_OPENAI_API_KEY

    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      throw new Error(
        'No API key configured. Set it in Settings for the OpenAI provider, or add VITE_OPENAI_API_KEY to your .env file.'
      )
    }

    const modelName =
      input.modelId || storeSettings?.selectedModel || import.meta.env.VITE_OPENAI_MODEL || DEFAULT_MODEL

    const temperature = input.temperature ?? 0.7
    const maxTokens = input.maxTokens && input.maxTokens > 0 ? input.maxTokens : undefined
    const systemPrompt = input.systemPrompt || DEFAULT_SYSTEM_PROMPT

    console.log(
      `${LOG_PREFIX} Starting with provider=${providerId} model=${modelName} temperature=${temperature} maxTokens=${maxTokens ?? 'unlimited'}`
    )

    reporter.progress(0, 'connecting')

    // --- Build the LangChain model -------------------------------------------

    const model = new ChatOpenAI({
      apiKey,
      model: modelName,
      streaming: true,
      ...(isReasoningModel(modelName) ? {} : { temperature }),
      ...(maxTokens ? { maxTokens } : {})
    })

    // --- Build message chain -------------------------------------------------

    const history = input.messages ?? []
    const langchainMessages = [
      new SystemMessage(systemPrompt),
      ...history.map((m) =>
        m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
      ),
      new HumanMessage(input.prompt)
    ]

    // --- Stream tokens -------------------------------------------------------

    let fullContent = ''
    let tokenCount = 0

    try {
      const stream = await model.stream(langchainMessages, { signal })

      for await (const chunk of stream) {
        if (signal.aborted) break

        const token = extractTokenFromChunk(chunk.content)
        if (token) {
          fullContent += token
          tokenCount++
          streamReporter?.stream(token)
        }
      }

      console.log(`${LOG_PREFIX} Completed: ${tokenCount} tokens, ${fullContent.length} chars`)

      return { content: fullContent, tokenCount }
    } catch (error: unknown) {
      const kind = classifyError(error)

      if (kind === 'abort') {
        throw new Error('Task cancelled')
      }

      const rawMessage = error instanceof Error ? error.message : String(error)
      console.error(`${LOG_PREFIX} Error (${kind}):`, rawMessage)

      throw new Error(toUserMessage(kind, rawMessage))
    }
  }
}
