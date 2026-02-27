/**
 * ChatModelFactory — creates a ChatOpenAI instance configured for the resolved provider.
 *
 * Uses OpenAI-compatible API endpoints for all providers, varying only
 * `baseURL` and `apiKey`.
 */

import { ChatOpenAI } from '@langchain/openai'
import { isReasoningModel } from './aiUtils'

const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
  openai: undefined,
  anthropic: 'https://api.anthropic.com/v1/',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  meta: 'https://api.llama.com/compat/v1/',
  mistral: 'https://api.mistral.ai/v1/',
}

export interface ChatModelOptions {
  providerId: string
  apiKey: string
  modelName: string
  streaming: boolean
  temperature?: number
  maxTokens?: number
}

export function createChatModel(opts: ChatModelOptions): ChatOpenAI {
  const { providerId, apiKey, modelName, streaming, temperature, maxTokens } = opts
  const baseURL = PROVIDER_BASE_URLS[providerId]

  return new ChatOpenAI({
    apiKey,
    model: modelName,
    streaming,
    ...(isReasoningModel(modelName) ? {} : { temperature }),
    ...(maxTokens ? { maxTokens } : {}),
    ...(baseURL ? { configuration: { baseURL } } : {}),
  })
}
