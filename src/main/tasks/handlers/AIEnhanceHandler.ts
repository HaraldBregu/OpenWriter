/**
 * AIEnhanceHandler -- Task handler for content block enhancement via LangChain.
 *
 * Accepts a text prompt and optional style parameters, builds a continuation
 * prompt, and streams tokens back via ProgressReporter.
 *
 * Token streaming uses: reporter.progress(0, 'token', { token })
 * The renderer listens for task:event with type 'progress' and message 'token'.
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { TaskHandler, ProgressReporter } from '../TaskHandler'
import type { StoreService } from '../../services/store'

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
const DEFAULT_MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT =
  'You are an expert writing assistant. When given a piece of text, you continue it ' +
  'seamlessly and naturally, maintaining the author\'s voice, style, and intent. ' +
  'Never repeat content that already exists. Output only the continuation text.'

const REASONING_MODEL_PREFIXES = ['o1', 'o3', 'o3-mini', 'o1-mini', 'o1-preview']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isReasoningModel(modelName: string): boolean {
  const normalized = modelName.toLowerCase()
  return REASONING_MODEL_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}-`)
  )
}

function extractTokenFromChunk(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((c): c is { text: string } => typeof c === 'object' && c !== null && 'text' in c)
      .map((c) => c.text)
      .join('')
  }
  return ''
}

function classifyError(error: unknown): 'abort' | 'auth' | 'rate_limit' | 'unknown' {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    const name = error.name.toLowerCase()
    if (name === 'aborterror' || msg.includes('abort') || msg.includes('cancel')) return 'abort'
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid api key'))
      return 'auth'
    if (msg.includes('429') || msg.includes('rate limit')) return 'rate_limit'
  }
  return 'unknown'
}

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

export class AIEnhanceHandler implements TaskHandler<AIEnhanceInput, AIEnhanceOutput> {
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
    reporter: ProgressReporter
  ): Promise<AIEnhanceOutput> {
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

    console.log(`${LOG_PREFIX} Starting with provider=${providerId} model=${modelName}`)

    reporter.progress(0, 'connecting')

    const model = new ChatOpenAI({
      apiKey,
      model: modelName,
      streaming: true,
      ...(isReasoningModel(modelName) ? {} : { temperature: 0.7 })
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
          reporter.progress(0, 'token', { token })
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

      const userMessage =
        kind === 'auth'
          ? 'Authentication failed. Please check your API key in Settings.'
          : kind === 'rate_limit'
            ? 'Rate limit exceeded. Please wait a moment and try again.'
            : `OpenAI request failed: ${rawMessage}`

      throw new Error(userMessage)
    }
  }
}
