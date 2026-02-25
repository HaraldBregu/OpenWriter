/**
 * ChatAgent -- LangChain OpenAI pipeline agent.
 *
 * Streams tokens from OpenAI via LangChain, yielding AgentEvents that the
 * PipelineService forwards to the renderer through the EventBus.
 *
 * API key resolution order:
 *  1. StoreService (via input.context.providerId) -- matches the existing
 *     AgentController pattern so users who configured their key in Settings
 *     can use it immediately.
 *  2. VITE_OPENAI_API_KEY environment variable (fallback).
 *
 * Model resolution:
 *  StoreService (selectedModel) -> VITE_OPENAI_MODEL env var -> gpt-4o-mini.
 *
 * The renderer can optionally pass conversation history via
 * `input.context.messages` as an array of { role, content } objects and a
 * system prompt via `input.context.systemPrompt`.
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import type { Agent, AgentInput, AgentEvent } from '../AgentBase'
import type { StoreService } from '../../services/store'
import { isReasoningModel, extractTokenFromChunk, classifyError } from '../../shared/aiUtils'
import { ProviderResolver } from '../../shared/ProviderResolver'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[ChatAgent]'
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant.'

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

// ---------------------------------------------------------------------------
// Agent implementation
// ---------------------------------------------------------------------------

export class ChatAgent implements Agent {
  readonly name = 'chat'

  constructor(private readonly storeService: StoreService) {}

  async *run(input: AgentInput, runId: string, signal: AbortSignal): AsyncGenerator<AgentEvent> {
    // --- Resolve configuration -----------------------------------------------

    const providerId = (input.context?.providerId as string) || 'openai'
    const storeSettings = this.storeService.getModelSettings(providerId)

    console.log(`${LOG_PREFIX} Run ${runId} - StoreSettings:`, storeSettings)
    console.log(`${LOG_PREFIX} Run ${runId} - ENV API Key exists:`, !!import.meta.env.VITE_OPENAI_API_KEY)
    console.log(`${LOG_PREFIX} Run ${runId} - ENV API Key prefix:`, import.meta.env.VITE_OPENAI_API_KEY?.substring(0, 10))

    const apiKey = storeSettings?.apiToken || import.meta.env.VITE_OPENAI_API_KEY

    console.log(`${LOG_PREFIX} Run ${runId} - Final API Key exists:`, !!apiKey)
    console.log(`${LOG_PREFIX} Run ${runId} - Final API Key prefix:`, apiKey?.substring(0, 10))

    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      console.error(`${LOG_PREFIX} Run ${runId} - API key validation failed`)
      yield {
        type: 'error',
        data: {
          runId,
          message:
            'No API key configured. Set it in Settings for the OpenAI provider, or add VITE_OPENAI_API_KEY to your .env file.'
        }
      }
      return
    }

    // modelId from context overrides the store's selectedModel
    const contextModelId = input.context?.modelId as string | undefined
    const modelName =
      contextModelId || storeSettings?.selectedModel || import.meta.env.VITE_OPENAI_MODEL || DEFAULT_MODEL

    // temperature from context overrides default 0.7
    const contextTemperature = input.context?.temperature as number | undefined
    const temperature = contextTemperature ?? 0.7

    // maxTokens from context (null / 0 = unlimited)
    const contextMaxTokens = input.context?.maxTokens as number | undefined
    const maxTokens = contextMaxTokens && contextMaxTokens > 0 ? contextMaxTokens : undefined

    const systemPrompt =
      (input.context?.systemPrompt as string | undefined) || DEFAULT_SYSTEM_PROMPT

    console.log(
      `${LOG_PREFIX} Starting run ${runId} with provider=${providerId} model=${modelName} temperature=${temperature} maxTokens=${maxTokens ?? 'unlimited'} systemPrompt="${systemPrompt.substring(0, 50)}..."`
    )

    yield { type: 'thinking', data: { runId, text: 'Connecting to OpenAI...' } }

    // --- Build the LangChain model -------------------------------------------

    const model = new ChatOpenAI({
      apiKey,
      model: modelName,
      streaming: true,
      ...(isReasoningModel(modelName) ? {} : { temperature }),
      ...(maxTokens ? { maxTokens } : {})
    })

    // --- Build message chain -------------------------------------------------
    // System prompt + optional conversation history + current user prompt.

    const history = (input.context?.messages as HistoryMessage[] | undefined) ?? []
    const langchainMessages = [
      new SystemMessage(systemPrompt),
      ...history.map((m) =>
        m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
      ),
      new HumanMessage(input.prompt)
    ]

    // --- Stream tokens -------------------------------------------------------

    try {
      const stream = await model.stream(langchainMessages, { signal })

      for await (const chunk of stream) {
        if (signal.aborted) break

        const token = extractTokenFromChunk(chunk.content)
        if (token) {
          yield { type: 'token', data: { runId, token } }
        }
      }

      if (!signal.aborted) {
        console.log(`${LOG_PREFIX} Run ${runId} completed`)
        yield { type: 'done', data: { runId } }
      } else {
        console.log(`${LOG_PREFIX} Run ${runId} cancelled`)
      }
    } catch (error: unknown) {
      const kind = classifyError(error)

      if (kind === 'abort') {
        // Cancellation is not an error -- just stop silently.
        // PipelineService will clean up the active run entry.
        console.log(`${LOG_PREFIX} Run ${runId} aborted`)
        return
      }

      const rawMessage = error instanceof Error ? error.message : String(error)
      console.error(`${LOG_PREFIX} Run ${runId} error (${kind}):`, rawMessage)

      const userMessage =
        kind === 'auth'
          ? 'Authentication failed. Please check your API key in Settings.'
          : kind === 'rate_limit'
            ? 'Rate limit exceeded. Please wait a moment and try again.'
            : `OpenAI request failed: ${rawMessage}`

      yield { type: 'error', data: { runId, message: userMessage } }
    }
  }
}
