/**
 * AIEnhanceHandler -- Task handler for content block enhancement via LangChain.
 *
 * Accepts a text prompt and optional style parameters, builds a continuation
 * prompt, and streams tokens back via StreamReporter.
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { TasksManagerHandler, ProgressReporter, StreamReporter } from '../TasksManagerHandler'
import type { StoreService } from '../../services/store'
import { extractTokenFromChunk, classifyError, toUserMessage } from '../../shared/aiUtils'
import { ProviderResolver } from '../../shared/ProviderResolver'
import { createChatModel } from '../../shared/ChatModelFactory'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIEnhanceInput {
  text: string
  genre?: string
  tone?: string
  pov?: string
  wordCount?: number
  direction?: string
  providerId?: string
  modelId?: string
}

export interface AIEnhanceOutput {
  content: string
  tokenCount: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[AIEnhanceHandler]'

const SYSTEM_PROMPT =
  'You are an expert writing assistant. When given a piece of text, you continue it ' +
  'seamlessly and naturally, maintaining the author\'s voice, style, and intent. ' +
  'Never repeat content that already exists. Output only the continuation text.'

function buildContinuationPrompt(input: AIEnhanceInput): string {
  const { text, genre, tone, pov, wordCount, direction } = input
  return (
    `Continue the following text seamlessly. Pick up exactly where it left off without repeating any existing content.` +
    (genre ? ` The text is a ${genre}.` : '') +
    (tone ? ` Maintain a ${tone} tone.` : '') +
    (pov ? ` Keep the ${pov} point of view.` : '') +
    (wordCount ? ` Write approximately ${wordCount} words.` : '') +
    (direction ? ` The continuation should ${direction}.` : '') +
    `\n\nHere is the text to continue:\n\n${text}`
  )
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export class AIEnhanceHandler implements TasksManagerHandler<AIEnhanceInput, AIEnhanceOutput> {
  readonly type = 'ai-enhance'

  constructor(private readonly storeService: StoreService) {}

  validate(input: AIEnhanceInput): void {
    if (!input.text || typeof input.text !== 'string' || !input.text.trim()) {
      throw new Error('Text is required and must be a non-empty string')
    }
  }

  async execute(
    input: AIEnhanceInput,
    signal: AbortSignal,
    reporter: ProgressReporter,
    streamReporter?: StreamReporter
  ): Promise<AIEnhanceOutput> {
    const resolver = new ProviderResolver(this.storeService)
    const provider = resolver.resolve({
      providerId: input.providerId,
      modelId: input.modelId
    })

    const { apiKey, modelName, providerId } = provider

    console.log(`${LOG_PREFIX} Starting with provider=${providerId} model=${modelName}`)

    reporter.progress(0, 'connecting')

    const model = createChatModel({
      providerId,
      apiKey,
      modelName,
      streaming: true,
      temperature: 0.7,
    })

    const prompt = buildContinuationPrompt(input)
    const messages = [new SystemMessage(SYSTEM_PROMPT), new HumanMessage(prompt)]

    let fullContent = ''
    let tokenCount = 0

    try {
      const stream = await model.stream(messages, { signal })

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
