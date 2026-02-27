/**
 * AgentExecutor — consolidated LangChain streaming generator.
 *
 * Replaces the duplicated streaming logic found in AIChatHandler,
 * AIEnhanceHandler, ChatAgent, and EnhanceAgent with a single
 * async generator that yields AgentStreamEvents.
 */

import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import type { ResolvedProvider } from '../shared/ProviderResolver'
import { extractTokenFromChunk, classifyError, toUserMessage } from '../shared/aiUtils'
import { createChatModel } from '../shared/ChatModelFactory'
import type { AgentStreamEvent } from './AgentManagerTypes'
import type { HistoryMessage } from './AgentSession'

const LOG_PREFIX = '[AgentExecutor]'

export interface ExecutorInput {
  runId: string
  provider: ResolvedProvider
  systemPrompt: string
  temperature: number
  maxTokens: number | undefined
  history: HistoryMessage[]
  prompt: string
  signal?: AbortSignal
}

/**
 * Core streaming generator. Yields `AgentStreamEvent` items.
 *
 * The caller is responsible for collecting the full response and
 * appending it to session history.
 */
export async function* executeAgentStream(
  input: ExecutorInput
): AsyncGenerator<AgentStreamEvent> {
  const { runId, provider, systemPrompt, temperature, maxTokens, history, prompt, signal } = input
  const { apiKey, modelName } = provider

  console.log(
    `${LOG_PREFIX} run=${runId} provider=${provider.providerId} model=${modelName} temp=${temperature} maxTokens=${maxTokens ?? 'unlimited'}`
  )

  // --- Build LangChain model ------------------------------------------------

  const model = new ChatOpenAI({
    apiKey,
    model: modelName,
    streaming: true,
    ...(isReasoningModel(modelName) ? {} : { temperature }),
    ...(maxTokens ? { maxTokens } : {}),
  })

  // --- Build message chain ---------------------------------------------------

  const langchainMessages = [
    new SystemMessage(systemPrompt),
    ...history.map((m) =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
    new HumanMessage(prompt),
  ]

  // --- Stream ----------------------------------------------------------------

  let fullContent = ''
  let tokenCount = 0

  try {
    const stream = await model.stream(langchainMessages, { signal })

    for await (const chunk of stream) {
      if (signal?.aborted) break

      const token = extractTokenFromChunk(chunk.content)
      if (token) {
        fullContent += token
        tokenCount++
        yield { type: 'token', token, runId }
      }
    }

    console.log(`${LOG_PREFIX} run=${runId} completed: ${tokenCount} tokens, ${fullContent.length} chars`)
    yield { type: 'done', content: fullContent, tokenCount, runId }
  } catch (error: unknown) {
    const kind = classifyError(error)

    if (kind === 'abort') {
      yield { type: 'error', error: 'Cancelled', code: 'abort', runId }
      return
    }

    const rawMessage = error instanceof Error ? error.message : String(error)
    console.error(`${LOG_PREFIX} run=${runId} error (${kind}):`, rawMessage)

    yield { type: 'error', error: toUserMessage(kind, rawMessage), code: kind, runId }
  }
}
