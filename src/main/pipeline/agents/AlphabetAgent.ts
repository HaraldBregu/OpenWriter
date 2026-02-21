/**
 * AlphabetAgent -- LangChain-powered alphabet agent for concurrent pipeline testing.
 *
 * Uses OpenAI to generate creative alphabet sequences with educational content.
 * Useful for testing concurrent AI pipeline execution with real LLM streaming.
 *
 * Resolves the API key in this order:
 *  1. StoreService (via input.context.providerId)
 *  2. VITE_OPENAI_API_KEY environment variable (fallback)
 *
 * Usage:
 * - Simple alphabet: "list the alphabet"
 * - With words: "alphabet with animals for each letter"
 * - Educational: "alphabet with phonetic pronunciations"
 * - Languages: "first 10 letters of the Greek alphabet"
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { Agent, AgentInput, AgentEvent } from '../AgentBase'
import type { StoreService } from '../../services/store'

const DEFAULT_MODEL = 'gpt-4o-mini'

export class AlphabetAgent implements Agent {
  readonly name = 'alphabet'

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

    // Parse the user's request or default to simple alphabet listing
    const userPrompt = input.prompt.trim() || 'List the alphabet from A to Z'
    const systemPrompt = `You are a helpful alphabet assistant. When asked about the alphabet, provide clear, educational responses. You can list letters, provide examples with words, explain pronunciations, or teach alphabets from different languages. Make your responses engaging and informative. Always stream your response token by token.`

    yield { type: 'thinking', data: { runId, text: 'Preparing alphabet lesson with AI...' } }

    // Check if model supports temperature (reasoning models like o1, o3-mini don't)
    const isReasoningModel = modelName.includes('o1') || modelName.includes('o3')

    const model = new ChatOpenAI({
      apiKey,
      model: modelName,
      streaming: true,
      ...(isReasoningModel ? {} : { temperature: 0.7 })
    })

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]

    const stream = await model.stream(messages, { signal })

    // Same approach as AgentController.ts
    for await (const chunk of stream) {
      if (signal.aborted) break

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
        yield { type: 'token', data: { runId, token } }
      }
    }

    if (!signal.aborted) {
      yield { type: 'done', data: { runId } }
    }
  }
}
