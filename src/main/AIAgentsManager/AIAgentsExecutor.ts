/**
 * AIAgentsExecutor — consolidated LangChain streaming generator.
 *
 * Supports two execution paths:
 * 1. Plain chat completion (legacy) — when no buildGraph is supplied.
 * 2. LangGraph StateGraph (graph path) — when buildGraph is supplied.
 *    The graph is streamed with streamMode:"messages" to yield tokens.
 */

import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { CompiledStateGraph } from '@langchain/langgraph'
import type { ResolvedProvider } from '../shared/ProviderResolver'
import { extractTokenFromChunk, classifyError, toUserMessage } from '../shared/aiUtils'
import { createChatModel } from '../shared/ChatModelFactory'
import type { AgentStreamEvent } from './AIAgentsManagerTypes'
import type { AIAgentsHistoryMessage } from './AIAgentsSession'

const LOG_PREFIX = '[AIAgentsExecutor]'

export interface ExecutorInput {
  runId: string
  provider: ResolvedProvider
  systemPrompt: string
  temperature: number
  maxTokens: number | undefined
  history: AIAgentsHistoryMessage[]
  prompt: string
  signal?: AbortSignal
  /**
   * LangGraph factory — when supplied the executor runs the graph path.
   * The factory receives the already-configured streaming model.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildGraph?: (model: BaseChatModel) => CompiledStateGraph<any, any, any, any, any, any>
}

/**
 * Core streaming generator. Yields `AgentStreamEvent` items.
 *
 * The caller is responsible for collecting the full response and
 * appending it to session history.
 */
export async function* executeAIAgentsStream(
  input: ExecutorInput
): AsyncGenerator<AgentStreamEvent> {
  const { runId, provider, systemPrompt, temperature, maxTokens, history, prompt, signal, buildGraph } = input
  const { apiKey, modelName } = provider

  console.log(
    `${LOG_PREFIX} run=${runId} provider=${provider.providerId} model=${modelName} temp=${temperature} maxTokens=${maxTokens ?? 'unlimited'} graph=${buildGraph ? 'yes' : 'no'}`
  )

  // --- Build LangChain model ------------------------------------------------

  const model = createChatModel({
    providerId: provider.providerId,
    apiKey,
    modelName,
    streaming: true,
    temperature,
    maxTokens,
  })

  // --- Build message chain (shared by both paths) ---------------------------

  const langchainMessages = [
    new SystemMessage(systemPrompt),
    ...history.map((m) =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
    new HumanMessage(prompt),
  ]

  // --- LangGraph path --------------------------------------------------------

  if (buildGraph) {
    yield* executeGraphStream({ runId, model, langchainMessages, buildGraph, signal })
    return
  }

  // --- Plain chat completion path -------------------------------------------

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

// ---------------------------------------------------------------------------
// Graph streaming sub-generator
// ---------------------------------------------------------------------------

interface GraphStreamInput {
  runId: string
  model: BaseChatModel
  langchainMessages: (HumanMessage | AIMessage | SystemMessage)[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildGraph: (model: BaseChatModel) => CompiledStateGraph<any, any, any, any, any, any>
  signal?: AbortSignal
}

async function* executeGraphStream(input: GraphStreamInput): AsyncGenerator<AgentStreamEvent> {
  const { runId, model, langchainMessages, buildGraph, signal } = input

  let fullContent = ''
  let tokenCount = 0

  try {
    const graph = buildGraph(model)

    const stream = await graph.stream(
      { messages: langchainMessages },
      { streamMode: 'messages', signal: signal as AbortSignal | undefined }
    )

    for await (const item of stream) {
      if (signal?.aborted) break

      // streamMode:"messages" yields [chunk, metadata] tuples
      const [chunk] = Array.isArray(item) ? item : [item, {}]

      if (!chunk) continue

      // Extract text token from the chunk content
      const token = extractTokenFromChunk(
        typeof chunk === 'object' && chunk !== null && 'content' in chunk
          ? (chunk as { content: unknown }).content
          : ''
      )

      if (token) {
        fullContent += token
        tokenCount++
        yield { type: 'token', token, runId }
      }
    }

    console.log(`${LOG_PREFIX} run=${runId} graph completed: ${tokenCount} tokens, ${fullContent.length} chars`)
    yield { type: 'done', content: fullContent, tokenCount, runId }
  } catch (error: unknown) {
    const kind = classifyError(error)

    if (kind === 'abort') {
      yield { type: 'error', error: 'Cancelled', code: 'abort', runId }
      return
    }

    const rawMessage = error instanceof Error ? error.message : String(error)
    console.error(`${LOG_PREFIX} run=${runId} graph error (${kind}):`, rawMessage)

    yield { type: 'error', error: toUserMessage(kind, rawMessage), code: kind, runId }
  }
}
