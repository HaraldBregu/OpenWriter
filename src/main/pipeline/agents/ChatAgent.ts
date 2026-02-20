/**
 * ChatAgent -- LangChain OpenAI pipeline agent.
 *
 * Resolves the API key in this order:
 *  1. StoreService (via input.context.providerId) — matches the existing
 *     AgentController pattern so users who have configured their key in
 *     Settings can use it immediately.
 *  2. VITE_OPENAI_API_KEY environment variable (fallback).
 *
 * The model is resolved from StoreService (selectedModel) or VITE_OPENAI_MODEL
 * env var, defaulting to gpt-4o-mini.
 *
 * The renderer can optionally pass conversation history via
 * `input.context.messages` as an array of { role, content } objects.
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import type { Agent, AgentInput, AgentEvent } from '../AgentBase'
import type { StoreService } from '../../services/store'

const DEFAULT_MODEL = 'gpt-4o-mini'

interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export class ChatAgent implements Agent {
  readonly name = 'chat'

  constructor(private readonly storeService: StoreService) {}

  async *run(input: AgentInput, runId: string, signal: AbortSignal): AsyncGenerator<AgentEvent> {
    // Resolve API key: StoreService first, env var fallback
    const providerId = (input.context?.providerId as string) || 'openai'
    const storeSettings = this.storeService.getModelSettings(providerId)

    const apiKey = storeSettings?.apiToken || import.meta.env.VITE_OPENAI_API_KEY
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
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

    const modelName =
      storeSettings?.selectedModel || import.meta.env.VITE_OPENAI_MODEL || DEFAULT_MODEL

    yield { type: 'thinking', data: { runId, text: 'Connecting to OpenAI...' } }

    const model = new ChatOpenAI({
      apiKey,
      model: modelName,
      streaming: true
    })

    // Build message chain: system prompt + optional history + current prompt
    const history = (input.context?.messages as HistoryMessage[] | undefined) ?? []
    const langchainMessages = [
      new SystemMessage('You are a helpful AI assistant.'),
      ...history.map((m) =>
        m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
      ),
      new HumanMessage(input.prompt)
    ]

    const stream = await model.stream(langchainMessages, { signal })

    for await (const chunk of stream) {
      if (signal.aborted) return

      const token =
        typeof chunk.content === 'string'
          ? chunk.content
          : Array.isArray(chunk.content)
            ? chunk.content
                .filter((c): c is { type: string; text: string } =>
                  typeof c === 'object' && c !== null && 'text' in c
                )
                .map((c) => c.text)
                .join('')
            : ''

      if (token) {
        yield { type: 'token', data: { runId, token } }
      }
    }

    yield { type: 'done', data: { runId } }
  }
}
